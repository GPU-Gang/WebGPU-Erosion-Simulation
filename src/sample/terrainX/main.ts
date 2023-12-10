import { Mat4, mat4, vec2, Vec2, Vec3, vec3, vec4 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';
import Camera from '../camera';
import erosionWGSL from './erosion.wgsl';
import fullscreenTexturedWGSL from '../../shaders/fullscreenTexturedQuad.wgsl';
import terrainRaymarch from '../../shaders/terrainRaymarch.wgsl';
import Quad from './rendering/quad';
import TerrainQuad from './rendering/terrain';
import TerrainParams from './terrainParams';

import {createTextureFromImageWithMip} from './mipmaps';

// File paths
const hfDir = 'assets/heightfields/';
const upliftDir = 'assets/uplifts/';
const streamPath = 'assets/stream/streamInput.png';
// GUI dropdowns
const heightfields = ['hfTest6', 'hfTest2', 'hfTest3', 'hfTest4', 'hfTest1', 'hfTest5'];
const uplifts = ['alpes_noise', 'lambda'];
const customBrushes = ['pattern1_bg', 'pattern2_bg', 'pattern3_bg']; // currently only affects uplift map
const shading = ['Normal', 'Lambertian'];

const MIN_BRUSH_SCALE = 0;
const MAX_BRUSH_SCALE = 10;

// Pre-loaded textures
let hfTextureArr : GPUTexture[] = [];
let upliftTextureArr : GPUTexture[] = [];
let brushTextureArr : GPUTexture[] = [];

let hfTextures : GPUTexture[] = []; // Ping-pong buffers for heightfields
let upliftTextures : GPUTexture[] = []; // Ping-pong buffers for uplift fields
let currBrushTexture : GPUTexture;
// let streamTextures : GPUTexture[] = [];
let streamBuffers : GPUBuffer[] = [];
let steepestFlowBuffer : GPUBuffer;

// Ping-Pong texture index
let currSourceTexIndex = 0;
let clicked = false;
let clickX = 0;
let clickY = 0;
let upliftPainted = vec2.fromValues(-1, -1);

// Geometries
let inputHeightmapDisplayQuad: Quad;
let terrainQuad: TerrainQuad;

//state-dependent flags
let usingCustomHeightMap = false;
let customHfImageBitmap = null;
let renderBundleNeedsToBeUpdated = true;

function setupGeometry(device: GPUDevice)
{
  inputHeightmapDisplayQuad = new Quad(vec4.create(2.5,2.5,0,0), vec3.create(0.3,0.3,1));
  inputHeightmapDisplayQuad.create(device);

  terrainQuad = new TerrainQuad(vec4.create(0,0,0,0), vec3.create(1,1,1));
  terrainQuad.create(device);
}

function rayPlaneIntersection(rayOrigin: Vec3, rayDir: Vec3, terrainParams: TerrainParams)
{
  // the plane of terrain quad is initially screen-facing so its normal is assumed to be facing the camera
  let planeNormal = vec4.create(0,1,0,0);
  let c = vec4.create(0,0,0,0);
  let t = vec3.dot(planeNormal,vec3.sub(c, rayOrigin)) / vec3.dot(planeNormal, rayDir);
  let interesection = vec3.add(rayOrigin, vec3.mulScalar(rayDir, t));
  if(t < 0 ||
    interesection[0] < terrainParams.lowerVertX ||
    interesection[0] > terrainParams.upperVertX ||
    interesection[2] < terrainParams.lowerVertY ||
    interesection[2] > terrainParams.upperVertY) {
      return [false, null];
    }
    return [true, interesection];
}

function rayCast(camera:Camera, width:number, height:number, px:number, py:number)
{
    let uv_x =  2.0 * px/width - 1.0;
    let uv_y =  2.0 * py/height - 1.0;
    let aspectRatio = width/height;

    const PI = 3.14159265358979323;
    const FOVY = 45.0 * PI / 180.0;
    let V = vec3.mulScalar(camera.up, Math.tan(FOVY * 0.5));
    let H = vec3.mulScalar(camera.right, Math.tan(FOVY * 0.5) * aspectRatio);
    
    //ref = cam.pos + cam.forward
    //p = ref + H * ndc.x + V * ndc.y
    let p = vec3.add(vec3.add(camera.getPosition(),camera.forward), vec3.mulScalar(H, uv_x));
    vec3.add(p, vec3.mulScalar(V, uv_y), p);
    
    let rayDir = vec3.sub(p, camera.getPosition());
    return vec3.normalize(rayDir);
}

function createRenderPipeline(device: GPUDevice, shaderText: string, presentationFormat: GPUTextureFormat)
{
  const renderPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({
        code: shaderText,
      }),
      entryPoint: 'vert_main',
      buffers:[
        // positions buffer
        {
          arrayStride: 4*4,
          attributes: [{
            shaderLocation: 0,
            format: "float32x4",
            offset: 0
          }]
        },
        // normals buffer
        {
          arrayStride: 4*4,
          attributes: [{
            shaderLocation: 1,
            format: "float32x4",
            offset: 0
          }]
        },
        // uvs buffer
        {
          arrayStride: 2*4,
          attributes: [{
            shaderLocation: 2,
            format: "float32x2",
            offset: 0
          }]
        }
      ]
    },
    fragment: {
      module: device.createShaderModule({
        code: shaderText,
      }),
      entryPoint: 'frag_main',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: 'back'
    },
  });

  return renderPipeline;
}

function writeMVPUniformBuffer(device: GPUDevice, uniformBuffer: GPUBuffer, bufferOffset: number,
                                modelMatrix: Mat4, camera: Camera,
                                isInScreenSpace: Boolean = false)
{
  const mvp = mat4.identity();

  var viewMatrix = camera.viewMatrix();

  if (isInScreenSpace)
  {
    mat4.multiply(mvp, modelMatrix, mvp);
  }
  else
  {
    mat4.multiply(viewMatrix, modelMatrix, mvp);
    mat4.multiply(camera.projectionMatrix, mvp, mvp);
  }

  // prettier-ignore
  device.queue.writeBuffer(
    uniformBuffer,
    bufferOffset,
    new Float32Array([
      // modelViewProjectionMatrix
      mvp[0], mvp[1], mvp[2], mvp[3],
      mvp[4], mvp[5], mvp[6], mvp[7],
      mvp[8], mvp[9], mvp[10], mvp[11],
      mvp[12], mvp[13], mvp[14], mvp[15],

      // 1,0,0,
      camera.right[0], camera.right[1], camera.right[2], // right

      0, // padding

      // 0,1,0,
      camera.up[0], camera.up[1], camera.up[2], // up

      0, // padding

      // 0,0,1,
      camera.forward[0], camera.forward[1], camera.forward[2], // forward

      0, // padding

      // 0,0,-3,
      camera.getPosition()[0], camera.getPosition()[1], camera.getPosition()[2], // u_Eye
      
      0,  // padding
      camera.resolution[0], camera.resolution[1], // screen dimensions
      0, 0, // padding
    ])
  );
}

function writeTerrainUniformBuffer(device: GPUDevice, terrainBuffer: GPUBuffer, terrainParams: TerrainParams, shading: number)
{
  // prettier-ignore
  device.queue.writeBuffer(
    terrainBuffer,
    0,
    new Float32Array([
      // texture size
      hfTextures[currSourceTexIndex].width, hfTextures[currSourceTexIndex].height,
      // AABB Lower Left Corner
      terrainParams.lowerVertX, terrainParams.lowerVertY,
      // AABB Upper Right Corner
      terrainParams.upperVertX, terrainParams.upperVertY,
      // 3D Render Shading Mode
      shading
    ])
  );
}

function createTextureOfSize(device: GPUDevice, width: number, height: number, greyscale: boolean, label?:string) {
  return device.createTexture({
    label: label,
    size: [width, height, 1],
    format: greyscale ? 'r8unorm' : 'rgba8unorm',
    mipLevelCount: 1,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT | 
      (!greyscale && GPUTextureUsage.STORAGE_BINDING) |
      (!greyscale && GPUTextureUsage.COPY_SRC),
  });
}

const createTextureFromImage = (
  device: GPUDevice,
  bitmap: ImageBitmap,
  greyscale: boolean,
  enqueue: boolean,
  label? : string,
) => {
  const texture = createTextureOfSize(device, bitmap.width, bitmap.height, greyscale, label);

  enqueue && device.queue.copyExternalImageToTexture(
    { source: bitmap },
    { texture: texture },
    [bitmap.width, bitmap.height]
  );
  
  return texture;
};


const init: SampleInit = async ({ canvas, pageState, gui, stats }) => {
  //////////////////////////////////////////////////////////////////////////////
  // GUI Controls
  //////////////////////////////////////////////////////////////////////////////
  gui.width = 280;
  
  const guiInputs = {
    heightfield: heightfields[0],
    uplift: uplifts[0],
    shadingMode: shading[0],
    eraseTerrain: false,
    useCustomBrush: false,
    customBrush: customBrushes[0],
    brushScale: MAX_BRUSH_SCALE,
    brushStrength: 10,
    heightFieldPath: "Not in use",
    onClickFunc: function() {
      var input = document.getElementById('img-path');
      input.addEventListener('change', async function() {
        const target = input as HTMLInputElement;        
          var file = target.files[0];
          if(target.files.length) { // needed to handle the case where the user just closes the file dialog
            const url = URL.createObjectURL(file);
            const response = await fetch(url);
            customHfImageBitmap = await createImageBitmap(await response.blob());
            usingCustomHeightMap = true;
            inputsChanged = 0;
            guiInputs.heightFieldPath = file.name;
            for (var i in gui.__controllers) {
              gui.__controllers[i].updateDisplay();
            }
            target.value = ''; //using file upload a second (or more) time(s) won't work without this
        }
      });
      input.click();
    },
    useRenderBundles: false
  };

  let inputsChanged = 0;
  const onChangeTextureHf = () => {
    inputsChanged = 0;
    usingCustomHeightMap = false;
  };

  const onChangeTextureUplift = () => {
    inputsChanged = 1;
  };

  const onChangeTextureBrush = () => {
    currBrushTexture = brushTextureArr[customBrushes.indexOf(guiInputs.customBrush)];
    inputsChanged = 2;
  };

   
  gui.add(guiInputs, 'heightfield', heightfields).onFinishChange(onChangeTextureHf);
  gui.add(guiInputs, 'uplift', uplifts).onFinishChange(onChangeTextureUplift);
  gui.add(guiInputs, 'shadingMode', shading);
  gui.add(guiInputs, 'eraseTerrain');
  gui.add(guiInputs, 'useCustomBrush');
  gui.add(guiInputs, 'customBrush', customBrushes).onFinishChange(onChangeTextureBrush);
  gui.add(guiInputs, 'brushScale', MIN_BRUSH_SCALE, MAX_BRUSH_SCALE, 1); // optional numbers: min, max, step
  gui.add(guiInputs, 'brushStrength', 0, 20); // <0.3 seems not showing anything
  gui.add(guiInputs, 'heightFieldPath').name("Custom Height Map");
  gui.add(guiInputs, 'onClickFunc').name('Upload Custom Height Map');
  gui.add(guiInputs, 'useRenderBundles').name("Use Render Bundles");
  

  //////////////////////////////////////////////////////////////////////////////
  // WebGPU Context Setup
  //////////////////////////////////////////////////////////////////////////////
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  //The following 2 event listeners mousedown and mousemove are to handle mouse-based terrain uplift painting
  canvas.addEventListener('mousedown', (e) => {
    if(e.ctrlKey) {
      //stop propagation is necessary so that the 3d-view-controls camera movements do not interfere while painting terrain
      e.stopImmediatePropagation();
      clicked = true;
      clickX = e.offsetX;
      clickY = e.offsetY;
    }
  }, true);

  canvas.addEventListener('mousemove', (e) => {
    if(e.ctrlKey) {
      //stopping propagation for the same reason as in mousedown event listener above
      e.stopImmediatePropagation();
      if(e.button == 0) {
        clickX = e.offsetX;
        clickY = e.offsetY;
      }
    }
  }, true);

  //once mouse button is released, clicks should no longer be perceived
  canvas.addEventListener('mouseup', () => {  
      clicked = false;
  });

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  setupGeometry(device);

  stats.showPanel(0); // 0 means show FPS by default.
  
  // Setup camera
  const target = vec3.create(terrainQuad.center[0],  terrainQuad.center[1] + 2, terrainQuad.center[2]);
  const camera = new Camera(vec3.create(0, 0, -10), target);
  camera.setResolution(vec2.create(canvas.width, canvas.height));
  camera.updateProjectionMatrix();

  //////////////////////////////////////////////////////////////////////////////
  // 2D Texture Render Pipeline
  //////////////////////////////////////////////////////////////////////////////
  const uiRenderPipeline = createRenderPipeline(device, fullscreenTexturedWGSL, presentationFormat);
  const terrainRenderPipeline = createRenderPipeline(device, terrainRaymarch, presentationFormat);

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

  // Uniform Buffers
  const offset = 256; // padding must be 256-byte aligned??
  const uniformBufferSize = offset +
    4 * 4 * 4 + // modelViewProjectionMatrix : mat4x4<f32>
    3 * 4 + // camera right : vec3<f32>
    4 + // padding
    3 * 4 + // camera up : vec3<f32>
    4 + // padding
    3 * 4 + // camera forward : vec3<f32>
    4 + // padding
    3 * 4 + // u_Eye : vec3<f32>
    4 + // padding
    2 * 4 + // screen dimensions : vec2<f32>
    2 * 4 + // padding
    0;
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const terrainUnifBufferSize = offset +
    2 * 4 +       // texture size (nx, ny)
    2 * 4 * 2 +   // AABB (vec2<f32> x2)
    4 +           // shading mode
    0;

  const terrainUnifBuffer = device.createBuffer({
    size: terrainUnifBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  //////////////////////////////////////////////////////////////////////////////
  // Texture
  //////////////////////////////////////////////////////////////////////////////

  let response;
  let imageBitmap;

  // heightmap
  //pre-load a set of existing heightfield textures
  heightfields.forEach(async heightFieldFileName =>{
    response = await fetch(hfDir + heightFieldFileName + '.png');
    imageBitmap = await createImageBitmap(await response.blob());
    hfTextureArr.push(
      createTextureFromImage(
        device,
        imageBitmap,
        false,
        true,
        `hf_${heightFieldFileName}`
      )
    );
  });

  // uplift
  //pre-load a set of existing uplift textures
  uplifts.forEach(async upliftFileName =>{
    response = await fetch(upliftDir + upliftFileName + '.png');
    imageBitmap = await createImageBitmap(await response.blob());
    upliftTextureArr.push(
      createTextureFromImage(
        device,
        imageBitmap,
        false,
        true,
        `uplift_${upliftFileName}`
      )
    );
  });

  // custom brush texture
  const burshPromises = customBrushes.map(async brush => 
    await createTextureFromImageWithMip(device,`${upliftDir}${brush}.png`, {mips: true, flipY: false})
  );
  brushTextureArr = await Promise.all(burshPromises);
  currBrushTexture = brushTextureArr[0];

  //////////////////////////////////////////////////////////////////////////////
  // Erosion Simulation Compute Pipeline
  //////////////////////////////////////////////////////////////////////////////

  const erosionComputePipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: device.createShaderModule({
        code: erosionWGSL,
      }),
      entryPoint: 'main',
    },
  });
  
  // simulation parameters
  const unifBufferSize =
    4 + 4 +         // image resolution: nx * ny
    2 * 4 * 2 +     // lower and upper vertices of a 2D box
    2 * 4 +         // cell diagonal vec2<f32>
    0;
  const simUnifBuffer = device.createBuffer({
    size: unifBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const simulationConstants = device.createBindGroup({
      label: "simulation constants",
      layout: erosionComputePipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
              buffer: simUnifBuffer,
          },
        },
      ],
  });

  // custom brush
  const unifBrushBufferSize =
    4 * 2 +         // 2d brush position
    4 +             // brush scale
    4 +             // brush strength
    4 +             // boolean useCustomBrush as an int
    4 +             // boolean eraseTerrain as an int
    0;
  const brushUnifBuffer = device.createBuffer({
    size: unifBrushBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const brushBindGroupDescriptor: GPUBindGroupDescriptor = {
    label: "brush bind group descriptor",
    layout: erosionComputePipeline.getBindGroupLayout(2),
    entries: [
      {
        binding: 0,
        resource: {
            buffer: brushUnifBuffer,
        },
      },
      {
        binding: 1,
        resource: currBrushTexture.createView(),
      },
    ],
  };
  let brushProperties = device.createBindGroup(brushBindGroupDescriptor);

  // hard-coded for milestone 1
  const terrainParams: TerrainParams = new TerrainParams();
  
  function rayCastToPaintTerrainOnClick() {
    let w = camera.resolution[0]/window.devicePixelRatio;// canvas.width;
      let h = camera.resolution[1]/window.devicePixelRatio;//canvas.height;

      let rayDir = rayCast(camera, w, h, clickX, clickY); //this ray is in world coordinates
      let rayOrigin = vec3.create(camera.getPosition()[0], camera.getPosition()[1],camera.getPosition()[2]);
            
      const [doesRayIntersectPlane, intersectionPointInWorldSpace] = rayPlaneIntersection(rayOrigin, rayDir, terrainParams);
      let px = -1, py = -1;
      if(doesRayIntersectPlane) {

        // lower left to current point
        let numerator = vec3.sub(
          vec3.create(intersectionPointInWorldSpace[0], intersectionPointInWorldSpace[1], intersectionPointInWorldSpace[2]),          
          vec3.create(terrainParams.lowerVertX, 0, terrainParams.lowerVertY));

        // full range
	      let denom = vec3.sub(
          vec3.create(terrainParams.upperVertX, 0, terrainParams.upperVertY),
          vec3.create(terrainParams.lowerVertX, 0, terrainParams.lowerVertY));
          
	      let uv = vec3.div(numerator, denom);    // remap the vec2 point to a 0->1 range
        
        px = Math.floor(uv[0]  * hfTextures[currSourceTexIndex].width);
        py = Math.floor(uv[2] * hfTextures[currSourceTexIndex].height);
      }
      upliftPainted[0] = px;
      upliftPainted[1] = py;
  }

  const terrainRenderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined, 
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ]
  };

  function renderTerrain(terrainPassEncoder: GPURenderPassEncoder | GPURenderBundleEncoder)
  {
    terrainPassEncoder.setPipeline(terrainRenderPipeline);
    // Draw main quad (terrain)
    writeMVPUniformBuffer(device, uniformBuffer, 0, terrainQuad.getModelMatrix(), camera, true);
    writeTerrainUniformBuffer(device, terrainUnifBuffer, terrainParams);
    terrainPassEncoder.setBindGroup(0, terrainQuad.bindGroup);
    terrainPassEncoder.setIndexBuffer(terrainQuad.indexBuffer, "uint32");
    terrainPassEncoder.setVertexBuffer(0, terrainQuad.posBuffer);
    terrainPassEncoder.setVertexBuffer(1, terrainQuad.normalBuffer);
    terrainPassEncoder.setVertexBuffer(2, terrainQuad.uvBuffer);
    terrainPassEncoder.drawIndexed(terrainQuad.count);
  }

  function renderQuad(uiPassEncoder: GPURenderPassEncoder | GPURenderBundleEncoder)
  {
    uiPassEncoder.setPipeline(uiRenderPipeline);
    // Draw input texture as UI
    writeMVPUniformBuffer(device, uniformBuffer, offset, inputHeightmapDisplayQuad.getModelMatrix(), camera, true);
    uiPassEncoder.setBindGroup(0, inputHeightmapDisplayQuad.bindGroup);
    uiPassEncoder.setIndexBuffer(inputHeightmapDisplayQuad.indexBuffer, "uint32");
    uiPassEncoder.setVertexBuffer(0, inputHeightmapDisplayQuad.posBuffer);
    uiPassEncoder.setVertexBuffer(1, inputHeightmapDisplayQuad.normalBuffer);
    uiPassEncoder.setVertexBuffer(2, inputHeightmapDisplayQuad.uvBuffer);
    uiPassEncoder.drawIndexed(inputHeightmapDisplayQuad.count);
  }

  let terrainRenderBundle;
  function updateRenderBundle() {
    const renderBundleEncoder = device.createRenderBundleEncoder({
      colorFormats: [presentationFormat],
      //depthStencilFormat: 'depth24plus',
    });
    renderTerrain(renderBundleEncoder);
    terrainRenderBundle = renderBundleEncoder.finish();
  }

  let quadRenderBundle;
  function updateQuadRenderBundle() {
    const renderBundleEncoder = device.createRenderBundleEncoder({
      colorFormats: [presentationFormat],
      //depthStencilFormat: 'depth24plus',
    });
    renderQuad(renderBundleEncoder);
    quadRenderBundle = renderBundleEncoder.finish();
  }

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;    

    if(clicked) {
      rayCastToPaintTerrainOnClick();
    }
    else {
      // update camera
      camera.update();
      upliftPainted[0] = -1;
      upliftPainted[1] = -1;
    }

    stats.begin();    

    const commandEncoder = device.createCommandEncoder();
    
    // update compute bindGroups if input textures changed
    if (inputsChanged > -1) {
      if (inputsChanged == 0 || inputsChanged == 1) {
        let currHfTexture, currUpliftTexture, currHfBuffer;
        //this check is necessary for the first ever iteration
        if (hfTextures[0] && hfTextures[1]) {
          hfTextures[0].destroy();
          hfTextures[1].destroy();
          upliftTextures[0].destroy();
          upliftTextures[1].destroy();
          streamBuffers[0].destroy();
          streamBuffers[1].destroy();
          steepestFlowBuffer.destroy();
        }        

        if(usingCustomHeightMap) //use user-uploaded height field
        {
          currHfTexture = createTextureFromImage(
            device,
            customHfImageBitmap,
            false,
            true
          );
        }
        else //use one of the pre-loaded height fields that the user selected from the dropdown
        {
          //find the index of the selected heightfield on GUI in the pre-loaded heightfield texture array
          let currHfIdx = 0;        
          hfTextureArr.forEach(function (hfTexture, index) {
            if(hfTexture.label == `hf_${guiInputs.heightfield}`) {
              currHfIdx = index;
            }
          });
          currHfTexture = hfTextureArr[currHfIdx];
          if(customHfImageBitmap) {
            customHfImageBitmap.close(); //free up resources from custom uploaded height field, if any
          }
        }

        //figure out the current uplift texture in use
        {
          let currUpliftIdx = 0;        
          upliftTextureArr.forEach(function (upliftTexture, index) {
            if(upliftTexture.label == `uplift_${guiInputs.uplift}`) {
              currUpliftIdx = index;
            }
          });
          currUpliftTexture = upliftTextureArr[currUpliftIdx];
        }
    
        var hfWidth = currHfTexture.width;
        var hfHeight = currHfTexture.height;

        //after destroying, create them again with the different size
        hfTextures = [0, 1].map((index) => {
          return createTextureOfSize(
            device,
            hfWidth,
            hfHeight,
            false,
            `hf_${guiInputs.heightfield}_${index}`
          );
        });

        upliftTextures = [0, 1].map((index) => {
          return createTextureOfSize(
            device,
            currUpliftTexture.width,
            currUpliftTexture.height,
            false,
            `uplift_${guiInputs.uplift}_${index}`
          );
        });

        // ping-pong buffers for fluvial calculation
        // streamTextures = [0, 1].map(() => {
        //   return createTextureOfSize(
        //     device,
        //     hfWidth,
        //     hfHeight,
        //     false,
        //   );
        // });
        // device.queue.writeTexture(
        //   {texture: streamTextures[currSourceTexIndex],},
        //   new Float32Array(hfWidth * hfHeight * 4),
        //   {
        //     offset: 0,
        //     bytesPerRow: hfWidth * 4 * 4,  // 4 channels of 4-byte (32 bit) size floats
        //     rowsPerImage: hfHeight
        //   },
        //   { width: hfWidth, height: hfHeight}
        // );
        
        // as storage buffers
        streamBuffers = [0, 1].map(() => {
          const buffer = device.createBuffer({
            size: hfWidth * hfHeight * 4, // same resolution as heightmap
            usage: GPUBufferUsage.STORAGE |
                   GPUBufferUsage.COPY_DST |
                   GPUBufferUsage.COPY_SRC,
          });
          device.queue.writeBuffer(
            buffer,
            0,
            new Float32Array(hfHeight * hfWidth),
          );
          return buffer;
        });

        // steepest flow texture
        steepestFlowBuffer= device.createBuffer({
          size: hfWidth * hfHeight * 4,   // same resolution as heightmap
          usage:
            GPUBufferUsage.COPY_DST |
            GPUBufferUsage.STORAGE
        });
        device.queue.writeBuffer(
          steepestFlowBuffer,
          0, 
          new Uint32Array(hfHeight * hfWidth), 
        );

        //need to create these bind groups here instead of outside frame() since these are dependent on hfTextures
        terrainQuad.bindGroupCreated = false;
        inputHeightmapDisplayQuad.bindGroupCreated = false;
        
        commandEncoder.copyTextureToTexture(
          {            
            texture: currHfTexture, // source
          },
          {
            texture: hfTextures[currSourceTexIndex], // destination
          },
          {
            width: hfWidth,
            height: hfHeight,
          },
        );

        commandEncoder.copyTextureToTexture(
          {            
            texture: currUpliftTexture, // source
          },
          {
            texture: upliftTextures[currSourceTexIndex], // destination
          },
          {
            width: currUpliftTexture.width,
            height: currUpliftTexture.height,
          },
        );
      }
      
      if (inputsChanged == 2) {
        brushBindGroupDescriptor.entries[1].resource = currBrushTexture.createView();
        brushProperties = device.createBindGroup(brushBindGroupDescriptor);  
      }
      renderBundleNeedsToBeUpdated = true;
      inputsChanged = -1;
    }

    terrainQuad.createTerrainBindGroup(terrainRenderPipeline, uniformBuffer, 0, sampler, hfTextures[currSourceTexIndex], terrainUnifBuffer);
    inputHeightmapDisplayQuad.createBindGroup(uiRenderPipeline, uniformBuffer, offset, sampler, hfTextures[currSourceTexIndex]);

    if(renderBundleNeedsToBeUpdated && guiInputs.useRenderBundles) {      
      updateRenderBundle();
      updateQuadRenderBundle();
      renderBundleNeedsToBeUpdated = false;
    }

    //compute pass goes in the following stub
    {

      const computeBindGroupDescriptorCurr: GPUBindGroupDescriptor = {
        label: "compute bind group descriptor curr",
        layout: erosionComputePipeline.getBindGroupLayout(1),
        entries: [
          {
            binding: 1,
            resource: hfTextures[currSourceTexIndex].createView(),
          },
          {
            binding: 2,
            resource: hfTextures[(currSourceTexIndex + 1) % 2].createView(),
          },
          {
            binding: 3,
            resource: upliftTextures[currSourceTexIndex].createView(),
          },
          {
            binding: 4,
            resource: upliftTextures[(currSourceTexIndex + 1) % 2].createView(),
          },
          {
            binding: 5,
            // resource: streamTextures[currSourceTexIndex].createView(),
            resource: { buffer: streamBuffers[currSourceTexIndex] },
          },
          {
            binding: 6,
            // resource: streamTextures[(currSourceTexIndex + 1) % 2].createView(),
            resource: { buffer: streamBuffers[(currSourceTexIndex + 1) % 2] },
          },
          {
            binding: 7,
            resource: 
            {
               buffer: steepestFlowBuffer,
            },
          } 
        ],
      };

      let computeBindGroupCurr = device.createBindGroup(computeBindGroupDescriptorCurr);


      const computePass = commandEncoder.beginComputePass();
      computePass.setPipeline(erosionComputePipeline);

      // terrain parameters
      device.queue.writeBuffer(
        simUnifBuffer,
        0,
        new Float32Array([
            hfTextures[currSourceTexIndex].width, hfTextures[currSourceTexIndex].height,
            terrainParams.lowerVertX, terrainParams.lowerVertY,
            terrainParams.upperVertX, terrainParams.upperVertY,
            terrainParams.cellDiagX, terrainParams.cellDiagY,
        ])
      );

      // update brush params
      let erase = 0;
      let useCustom = 0;
      if (guiInputs.eraseTerrain) { erase = 1; }
      if (guiInputs.useCustomBrush) { useCustom = 1; }
      device.queue.writeBuffer(
        brushUnifBuffer,
        0,
        new Float32Array([
            upliftPainted[0], upliftPainted[1],
            useCustom ? MAX_BRUSH_SCALE - guiInputs.brushScale : guiInputs.brushScale,
            guiInputs.brushStrength,
            erase, useCustom,
        ])
      );

      computePass.setBindGroup(0, simulationConstants);
      computePass.setBindGroup(1, computeBindGroupCurr);
      computePass.setBindGroup(2, brushProperties);
      computePass.dispatchWorkgroups(
        Math.ceil(Math.max(hfTextures[currSourceTexIndex].width, hfTextures[currSourceTexIndex].height) / 8) + 1,
        Math.ceil(Math.max(hfTextures[currSourceTexIndex].width, hfTextures[currSourceTexIndex].height) / 8) + 1
      );
      computePass.end();
      currSourceTexIndex = (currSourceTexIndex + 1) % 2;
    }
    //Terrain render pass goes in the following stub
    {
      if(guiInputs.useRenderBundles)
      {
        terrainRenderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
        const terrainPassEncoder = commandEncoder.beginRenderPass(terrainRenderPassDescriptor);
        terrainPassEncoder.executeBundles([terrainRenderBundle, quadRenderBundle]);
        renderTerrain(terrainPassEncoder);
        renderQuad(terrainPassEncoder);
        terrainPassEncoder.end();
      }
      else
      {
      const terrainPassEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      });
      terrainPassEncoder.setPipeline(terrainRenderPipeline);
      
      // Draw main quad (terrain)
      writeMVPUniformBuffer(device, uniformBuffer, 0, terrainQuad.getModelMatrix(), camera, true);
      var shadingMode = shading.indexOf(guiInputs.shadingMode);
      writeTerrainUniformBuffer(device, terrainUnifBuffer, terrainParams, shadingMode);
      terrainPassEncoder.setBindGroup(0, terrainQuad.bindGroup);
      terrainPassEncoder.setIndexBuffer(terrainQuad.indexBuffer, "uint32");
      terrainPassEncoder.setVertexBuffer(0, terrainQuad.posBuffer);
      terrainPassEncoder.setVertexBuffer(1, terrainQuad.normalBuffer);
      terrainPassEncoder.setVertexBuffer(2, terrainQuad.uvBuffer);
      terrainPassEncoder.drawIndexed(terrainQuad.count);

      terrainPassEncoder.end();
    }
    }
    // UI render pass goes under the following stub
    {
      if(!guiInputs.useRenderBundles)
      {
      const uiPassEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
            loadOp: 'load',   // load the last render pass instead of clearing it
            storeOp: 'store',
          },
        ],
        });
      uiPassEncoder.setPipeline(uiRenderPipeline);
      
      // Draw input texture as UI
      writeMVPUniformBuffer(device, uniformBuffer, offset, inputHeightmapDisplayQuad.getModelMatrix(), camera, true);
      uiPassEncoder.setBindGroup(0, inputHeightmapDisplayQuad.bindGroup);
      uiPassEncoder.setIndexBuffer(inputHeightmapDisplayQuad.indexBuffer, "uint32");
      uiPassEncoder.setVertexBuffer(0, inputHeightmapDisplayQuad.posBuffer);
      uiPassEncoder.setVertexBuffer(1, inputHeightmapDisplayQuad.normalBuffer);
      uiPassEncoder.setVertexBuffer(2, inputHeightmapDisplayQuad.uvBuffer);
      uiPassEncoder.drawIndexed(inputHeightmapDisplayQuad.count);
      uiPassEncoder.end();
      }
    }

    device.queue.submit([commandEncoder.finish()]);
    
    requestAnimationFrame(frame);
    stats.end();
  }
  requestAnimationFrame(frame);  
};

const Terrain: () => JSX.Element = () =>
  makeSample({
    name: 'Terrain X',
    description:
      'Interactive terrain authoring and erosion simulation on WebGPU',
    gui: true,
    stats: true,
    init,
    filename: __filename,
  });

export default Terrain;
