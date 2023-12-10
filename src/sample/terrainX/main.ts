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
const heightfields = ['hfTest6', 'hfTest2', 'hfTest3', 'hfTest1', 'hfTest5'];
const uplifts = ['alpes_noise', 'lambda'];
const customBrushes = ['pattern1_bg', 'pattern2_bg', 'pattern3_bg']; // currently only affects uplift map

enum upliftTextureAtlas {
  alpes_noise,
  lambda,
}
enum brushTextureAtlas {
  pattern1_bg,
  pattern2_bg,
  pattern3_bg,
}
// Pre-loaded textures
let hfTextureArr : GPUTexture[] = [];
let upliftTextureArr : GPUTexture[] = [];
let brushTextureArr : GPUTexture[] = [];

let hfTextures : GPUTexture[] = []; // Ping-pong buffers for heightfields
let currUpliftTexture : GPUTexture;
let currBrushTexture : GPUTexture;
let streamTextures : GPUTexture[] = [];
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

function writeTerrainUniformBuffer(device: GPUDevice, terrainBuffer: GPUBuffer, terrainParams: TerrainParams)
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
    eraseTerrain: false,
    useCustomBrush: false,
    customBrush: customBrushes[0],
    brushScale: 10,
    brushStrength: 10, 
  };

  let inputsChanged = 0;
  const onChangeTextureHf = () => {
    inputsChanged = 0;
  };

  const onChangeTextureUplift = () => {
    currUpliftTexture = upliftTextureArr[upliftTextureAtlas[guiInputs.uplift]];
    inputsChanged = 1;
  };

  const onChangeTextureBrush = () => {
    currBrushTexture = brushTextureArr[brushTextureAtlas[guiInputs.customBrush]];
    inputsChanged = 2;
  };
  
  gui.add(guiInputs, 'heightfield', heightfields).onFinishChange(onChangeTextureHf);
  gui.add(guiInputs, 'uplift', uplifts).onFinishChange(onChangeTextureUplift);
  gui.add(guiInputs, 'eraseTerrain');
  gui.add(guiInputs, 'useCustomBrush');
  gui.add(guiInputs, 'customBrush', customBrushes).onFinishChange(onChangeTextureBrush);
  gui.add(guiInputs, 'brushScale', 0, 10, 1); // optional numbers: min, max, step
  gui.add(guiInputs, 'brushStrength', 0, 20); // <0.3 seems not showing anything

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
  response = await fetch(upliftDir + guiInputs.uplift + '.png');
  imageBitmap = await createImageBitmap(await response.blob());

  const upliftTextures = [0, 1].map((index) => {
    return createTextureFromImage(
      device,
      imageBitmap,
      false,
      false,
      `uplift_${guiInputs.uplift}_${index}`
    );
  });

  device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
    { texture: upliftTextures[currSourceTexIndex] },
    [imageBitmap.width, imageBitmap.height]
  );
  
  // pre-load all the uplift textures
  currUpliftTexture = createTextureFromImage(
    device,
    imageBitmap,
    true, // keep it as greyscale for now cuz this is not the actual buffer but just a one-time feed of input
    true,
    `uplift_${guiInputs.uplift}`
  );
  upliftTextureArr.push(currUpliftTexture);
  
  let nextTex = uplifts[1];
  response = await fetch(upliftDir + nextTex + '.png');
  imageBitmap = await createImageBitmap(await response.blob());
  upliftTextureArr.push(
    createTextureFromImage(
      device,
      imageBitmap,
      true,
      true,
      `uplift_${nextTex}`
    )
  );

  // stream area map
  response = await fetch(streamPath);
  imageBitmap = await createImageBitmap(await response.blob());

  // custom brush texture
  brushTextureArr = await Promise.all([
    await createTextureFromImageWithMip(device,
        `${upliftDir}${customBrushes[0]}.png`, {mips: true, flipY: false}),
    await createTextureFromImageWithMip(device,
        `${upliftDir}${customBrushes[1]}.png`, {mips: true, flipY: false}),
    await createTextureFromImageWithMip(device,
        `${upliftDir}${customBrushes[2]}.png`, {mips: true, flipY: false}),
  ]);
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
    4 * 2 +         // brush texture resolution
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
      if (inputsChanged == 0) {

        //find the index of the selected heightfield on GUI in the pre-loaded heightfield texture array
        let currHfIdx = 0;        
        hfTextureArr.forEach(function (hfTexture, index) {
          console.log(hfTexture.label, guiInputs.heightfield);
          if(hfTexture.label == `hf_${guiInputs.heightfield}`) {
            currHfIdx = index;
          }
        });

        let currHfTexture = hfTextureArr[currHfIdx];

        //this check is necessary for the first ever iteration
        if(hfTextures[0] && hfTextures[1]) {
        hfTextures[0].destroy();
        hfTextures[1].destroy();
        streamTextures[0].destroy();
        streamTextures[1].destroy();
        steepestFlowBuffer.destroy();
        }
  
        //after destroying, create them again with the different size
        hfTextures = [0, 1].map((index) => {
          return createTextureOfSize(
            device,
            currHfTexture.width,
            currHfTexture.height,
            false,
            `hf_${guiInputs.heightfield}_${index}`
          );          
        });

        var hfWidth = currHfTexture.width;
        var hfHeight = currHfTexture.height;

        // ping-pong buffers for fluvial calculation
        streamTextures = [0, 1].map(() => {
          return createTextureOfSize(
            device,
            currHfTexture.width,
            currHfTexture.height,
            false,
          );
        });

        var zeros = new Float32Array(hfWidth * hfHeight * 4); // 4 for 4 channels
        zeros.fill(0);

        device.queue.writeTexture(
          {texture: streamTextures[currSourceTexIndex],},
          zeros,
          {
            offset: 0,
            bytesPerRow: hfWidth * 4 * 4,  // 4 channels of 4-byte (32 bit) size floats
            rowsPerImage: hfHeight
          },
          { width: hfWidth, height: hfHeight}
        );

        // steepest flow texture
        steepestFlowBuffer= device.createBuffer({
          size: hfWidth * hfHeight * 4,   // same resolution as heightmap
          usage:
            GPUBufferUsage.COPY_DST |
            GPUBufferUsage.STORAGE
        });

        zeros = new Float32Array(hfWidth * hfHeight);
        zeros.fill(0);

        device.queue.writeBuffer(
          steepestFlowBuffer,
          0, 
          zeros.buffer,
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
            width: currHfTexture.width,
            height: currHfTexture.height,
          },
        );
        // console.log('new: ' + hfTextures[currSourceTexIndex].label);
      }

	// TODO: fix
      // computeBindGroupDescriptor0.entries[0].resource = hfTextures[0].createView();
      // computeBindGroupDescriptor0.entries[1].resource = hfTextures[1].createView();
      // computeBindGroupDescriptor1.entries[0].resource = hfTextures[1].createView();
      // computeBindGroupDescriptor1.entries[1].resource = hfTextures[0].createView();

      // if (inputsChanged == 1) {
      //   computeBindGroupDescriptor0.entries[2].resource = currUpliftTexture.createView();
      //   computeBindGroupDescriptor1.entries[2].resource = currUpliftTexture.createView();  
      // }
      
      // computeBindGroup0 = device.createBindGroup(computeBindGroupDescriptor0);
      // computeBindGroup1 = device.createBindGroup(computeBindGroupDescriptor1);
      // computeBindGroupArr = [computeBindGroup0, computeBindGroup1];
      
      if (inputsChanged == 2) {
        console.log(currBrushTexture.label);
        brushBindGroupDescriptor.entries[1].resource = currBrushTexture.createView();
        brushProperties = device.createBindGroup(brushBindGroupDescriptor);  
      }

      inputsChanged = -1;
    }

    terrainQuad.createTerrainBindGroup(terrainRenderPipeline, uniformBuffer, 0, sampler, hfTextures[currSourceTexIndex], terrainUnifBuffer);
    inputHeightmapDisplayQuad.createBindGroup(uiRenderPipeline, uniformBuffer, offset, sampler, hfTextures[currSourceTexIndex]);

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
            resource: upliftTextures[currSourceTexIndex].createView(), // currUpliftTexture
          },
          {
            binding: 4,
            resource: upliftTextures[(currSourceTexIndex + 1) % 2].createView(),
          },
          {
            binding: 5,
            resource: streamTextures[currSourceTexIndex].createView(),
          },
          {
            binding: 6,
            resource: streamTextures[(currSourceTexIndex + 1) % 2].createView(),
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
            guiInputs.brushScale, guiInputs.brushStrength,
            currBrushTexture.height, currBrushTexture.width,
            erase, useCustom,
        ])
      );

      computePass.setBindGroup(0, simulationConstants);
      computePass.setBindGroup(1, computeBindGroupCurr);
      computePass.setBindGroup(2, brushProperties);
      computePass.dispatchWorkgroups(
        //(Math.max(simulationParams.nx, simulationParams.ny) / 8) + 1, //dispatch size from paper doesn't work for our case
        //(Math.max(simulationParams.nx, simulationParams.ny) / 8) + 1
        Math.ceil(Math.max(hfTextures[currSourceTexIndex].width, hfTextures[currSourceTexIndex].height) / 8) + 1,
        Math.ceil(Math.max(hfTextures[currSourceTexIndex].width, hfTextures[currSourceTexIndex].height) / 8) + 1
      );
      computePass.end();
      currSourceTexIndex = (currSourceTexIndex + 1) % 2;
    }
    //Terrain render pass goes in the following stub
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
      writeTerrainUniformBuffer(device, terrainUnifBuffer, terrainParams);
      terrainPassEncoder.setBindGroup(0, terrainQuad.bindGroup);
      terrainPassEncoder.setIndexBuffer(terrainQuad.indexBuffer, "uint32");
      terrainPassEncoder.setVertexBuffer(0, terrainQuad.posBuffer);
      terrainPassEncoder.setVertexBuffer(1, terrainQuad.normalBuffer);
      terrainPassEncoder.setVertexBuffer(2, terrainQuad.uvBuffer);
      terrainPassEncoder.drawIndexed(terrainQuad.count);

      terrainPassEncoder.end();
    }
    // UI render pass goes under the following stub
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
