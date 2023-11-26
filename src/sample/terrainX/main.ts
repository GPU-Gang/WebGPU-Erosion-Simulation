import { Mat4, mat4, vec2, Vec2, vec3, vec4 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';
import Camera from '../camera';
import erosionWGSL from './erosion.wgsl';
import fullscreenTexturedWGSL from '../../shaders/fullscreenTexturedQuad.wgsl';
import terrainRaymarch from '../../shaders/terrainRaymarch.wgsl';
import Quad from './rendering/quad';
import TerrainQuad from './rendering/terrain';
import TerrainParams from './terrainParams';
import { Console } from 'console';

// File paths
const hfDir = 'assets/heightfields/';
const upliftDir = 'assets/uplifts/';
const streamPath = 'assets/stream/streamInput.png';
const heightfields = ['hfTest1', 'hfTest2'];
const uplifts = ['alpes_noise', 'lambda'];
const customBrushes = ['pattern1', 'pattern2', 'pattern3'];
enum hfTextureAtlas {
  hfTest1,
  hfTest2,
}
enum upliftTextureAtlas {
  alpes_noise,
  lambda,
}
// pre-loaded textures
let hfTextureArr : GPUTexture[] = [];
let upliftTextureArr : GPUTexture[] = [];

let hfTextures : GPUTexture[] = []; // ping-pong buffers for heightfields
let upliftTexture : GPUTexture;

// Ping-Pong texture index
let currSourceTexIndex = 0;

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
      terrainParams.nx, terrainParams.ny,
      // AABB Lower Left Corner
      terrainParams.lowerVertX, terrainParams.lowerVertY,
      // AABB Upper Right Corner
      terrainParams.upperVertX, terrainParams.upperVertY,
    ])
  );
}

const createTextureFromImage = (
  device: GPUDevice,
  bitmap: ImageBitmap,
  greyscale: boolean,
  enqueue: boolean,
  label? : string,
) => {
  const texture = device.createTexture({
    label: label,
    size: [bitmap.width, bitmap.height, 1],
    format: greyscale ? 'r8unorm' : 'rgba8unorm',
    mipLevelCount: 1,//numMipLevels,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT | 
      (!greyscale && GPUTextureUsage.STORAGE_BINDING),
  });
  enqueue && device.queue.copyExternalImageToTexture(
    { source: bitmap },
    { texture: texture },
    [bitmap.width, bitmap.height]
  );
  return texture;
};

const init: SampleInit = async ({ canvas, pageState, gui }) => {
  //////////////////////////////////////////////////////////////////////////////
  // GUI Controls
  //////////////////////////////////////////////////////////////////////////////
  gui.width = 280;
  
  const guiInputs = {
    heightfield: heightfields[0],
    uplift: uplifts[0],
    customBrush: customBrushes[0],
  };

  let inputsChanged = false;
  // TODO: heightfield still problematic
  const onChangeTextureHf = () => {
    let temp = hfTextures[currSourceTexIndex];
    hfTextures[currSourceTexIndex] = hfTextureArr[hfTextureAtlas[guiInputs.heightfield]];
    inputsChanged = true;
    console.log(`hf updated: ${temp.label}, ${hfTextures[currSourceTexIndex].label}`);
  };

  const onChangeTextureUplift = () => {
    upliftTexture = upliftTextureArr[upliftTextureAtlas[guiInputs.uplift]];
    inputsChanged = true;
  };

  gui.add(guiInputs, 'heightfield', heightfields).onChange(onChangeTextureHf);
  gui.add(guiInputs, 'uplift', uplifts).onChange(onChangeTextureUplift);
  gui.add(guiInputs, 'customBrush', customBrushes); // TODO

  // WebGPU Context Setup
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  setupGeometry(device);

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

  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
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

  // heightmap
  let response = await fetch(hfDir + guiInputs.heightfield + '.png');
  let imageBitmap = await createImageBitmap(await response.blob());
  const [srcWidth, srcHeight] = [imageBitmap.width, imageBitmap.height];
  
  // ping-pong buffers for 2d render
  hfTextures = [0, 1].map(() => {
    return createTextureFromImage(
      device,
      imageBitmap,
      false,
      false,
      `hf_${guiInputs.heightfield}`
    );
  });
  device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
    { texture: hfTextures[currSourceTexIndex] },
    [srcWidth, srcHeight]
  );

  // pre-load all the heightfield textures
  hfTextureArr.push(hfTextures[currSourceTexIndex]);
  
  let nextTex = heightfields[1];
  response = await fetch(hfDir + nextTex + '.png');
  imageBitmap = await createImageBitmap(await response.blob());
  hfTextureArr.push(
    createTextureFromImage(
      device,
      imageBitmap,
      false,
      true,
      `hf_${nextTex}`
    )
  );

  // uplift
  response = await fetch(upliftDir + guiInputs.uplift + '.png');
  imageBitmap = await createImageBitmap(await response.blob());
  
  upliftTexture = createTextureFromImage(
    device,
    imageBitmap,
    true,
    true,
    `uplift_${guiInputs.uplift}`
  );

  // pre-load all the uplift textures
  upliftTextureArr.push(upliftTexture);
  
  nextTex = uplifts[1];
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

  // ping-pong buffers for fluvial calculation
  const streamTextures = [0, 1].map(() => {
    return device.createTexture({
      size: [srcWidth, srcHeight, 1], // assuming same resolution as heightmap
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
  });
  device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
    { texture: streamTextures[currSourceTexIndex] },
    [srcWidth, srcHeight]
  );


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
    4 + 4 +         // image resolution: nx x ny
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

  // input/output textures
  const computeBindGroupDescriptor0: GPUBindGroupDescriptor = {
    label: "compute bind group descriptor 0",
    layout: erosionComputePipeline.getBindGroupLayout(1),
    entries: [
      {
        binding: 1,
        resource: hfTextures[0].createView(),
      },
      {
        binding: 2,
        resource: hfTextures[1].createView(),
      },
      {
        binding: 3,
        resource: upliftTexture.createView(),
      },
      {
        binding: 4,
        resource: streamTextures[0].createView(),
      },
      {
        binding: 5,
        resource: streamTextures[1].createView(),
      },
    ],
  };

  const computeBindGroupDescriptor1: GPUBindGroupDescriptor = {
    label: "compute bind group descriptor 1",
    layout: erosionComputePipeline.getBindGroupLayout(1),
    entries: [
      {
        binding: 1,
        resource: hfTextures[1].createView(),
      },
      {
        binding: 2,
        resource: hfTextures[0].createView(),
      },
      {
        binding: 3,
        resource: upliftTexture.createView(),
      },
      {
        binding: 4,
        resource: streamTextures[0].createView(),
      },
      {
        binding: 5,
        resource: streamTextures[1].createView(),
      },
    ],
  };
  
  let computeBindGroup0 = device.createBindGroup(computeBindGroupDescriptor0);
  let computeBindGroup1 = device.createBindGroup(computeBindGroupDescriptor1);
  let computeBindGroupArr = [computeBindGroup0, computeBindGroup1];

  terrainQuad.createTerrainBindGroup(terrainRenderPipeline, uniformBuffer, 0, sampler, hfTextures[currSourceTexIndex], terrainUnifBuffer);
  inputHeightmapDisplayQuad.createBindGroup(uiRenderPipeline, uniformBuffer, offset, sampler, hfTextures[currSourceTexIndex]);

  // hard-coded for milestone 1
  const terrainParams: TerrainParams = new TerrainParams();

  device.queue.writeBuffer(
    simUnifBuffer,
    0,
    new Float32Array([
        terrainParams.nx, terrainParams.ny,
        terrainParams.lowerVertX, terrainParams.lowerVertY,
        terrainParams.upperVertX, terrainParams.upperVertY,
        terrainParams.cellDiagX, terrainParams.cellDiagY,
    ])
  );

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    // update camera
    camera.update();

    // logging
    // console.log("============== CAMERA VIEW MATRIX ==============");
    // console.log("[" + camera.viewMatrix()[0] + "," + camera.viewMatrix()[4] + "," + camera.viewMatrix()[8] + "," + camera.viewMatrix()[3] + ",");
    // console.log(camera.viewMatrix()[1] + "," + camera.viewMatrix()[5] + "," + camera.viewMatrix()[9] + "," + camera.viewMatrix()[7] + ",");
    // console.log(camera.viewMatrix()[2] + "," + camera.viewMatrix()[6] + "," + camera.viewMatrix()[10] + "," + camera.viewMatrix()[11] + ",");
    // // console.log(camera.viewMatrix()[12] + "," + camera.viewMatrix()[13] + "," + camera.viewMatrix()[14] + "," + camera.viewMatrix()[15] + "]");
    // console.log("============== CAMERA POSITION ==============");
    // console.log("[" + camera.getPosition()[0] + "," + camera.getPosition()[1] + "," + camera.getPosition()[2] + "]");
    // // console.log("============== CAMERA UP ==============");
    // // console.log("[" + camera.Up()[0] + "," + camera.Up()[1] + "," + camera.Up()[2] + "]");

    // update bindGroups if input textures changed
    if (inputsChanged) {
      computeBindGroupDescriptor0.entries[0].resource = hfTextures[0].createView();
      computeBindGroupDescriptor0.entries[1].resource = hfTextures[1].createView();
      computeBindGroupDescriptor0.entries[2].resource = upliftTexture.createView();

      computeBindGroupDescriptor1.entries[0].resource = hfTextures[1].createView();
      computeBindGroupDescriptor1.entries[1].resource = hfTextures[0].createView();
      computeBindGroupDescriptor1.entries[2].resource = upliftTexture.createView();
      
      computeBindGroup0 = device.createBindGroup(computeBindGroupDescriptor0);
      computeBindGroup1 = device.createBindGroup(computeBindGroupDescriptor1);
      computeBindGroupArr = [computeBindGroup0, computeBindGroup1];

      console.log(`bind groups updated in frame()`);
    }

    const commandEncoder = device.createCommandEncoder();
    //compute pass goes in the following stub
    {
      const computePass = commandEncoder.beginComputePass();
      computePass.setPipeline(erosionComputePipeline);
      computePass.setBindGroup(0, simulationConstants);
      computePass.setBindGroup(1, computeBindGroupArr[currSourceTexIndex]);
      computePass.dispatchWorkgroups(
        //(Math.max(simulationParams.nx, simulationParams.ny) / 8) + 1, //dispatch size from paper doesn't work for our case
        //(Math.max(simulationParams.nx, simulationParams.ny) / 8) + 1
        Math.ceil(srcWidth),
        Math.ceil(srcHeight)
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
    inputsChanged = false;

    requestAnimationFrame(frame);
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
