import { Mat4, mat4, vec3, vec4 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';
import Camera from '../camera';
import erosionWGSL from './erosion.wgsl';
import fullscreenTexturedWGSL from '../../shaders/fullscreenTexturedQuad.wgsl';
import terrainRaymarch from '../../shaders/terrainRaymarch.wgsl';
import Quad from './rendering/quad';

let currSourceTexIndex = 0;

// Geometries
let inputHeightmapDisplayQuad: Quad;
let terrainQuad: Quad;

function setupGeometry(device: GPUDevice)
{
  inputHeightmapDisplayQuad = new Quad(vec4.create(2.5,2.5,0,0), vec3.create(0.3,0.3,1));
  inputHeightmapDisplayQuad.create(device);

  terrainQuad = new Quad(vec4.create(0,0,0,0), vec3.create(1,1,1), vec3.create(0,180,0));
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
        code: fullscreenTexturedWGSL,
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
                                modelMatrix: Mat4, viewMatrix: Mat4, projMatrix: Mat4)
{
  const mvp = mat4.identity();
  mat4.multiply(viewMatrix, modelMatrix, mvp);
  mat4.multiply(projMatrix, mvp, mvp);

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

      viewMatrix[0], viewMatrix[4], viewMatrix[8], // right

      0, // padding

      viewMatrix[1], viewMatrix[5], viewMatrix[9], // up

      0, // padding
    ])
  );
}

const init: SampleInit = async ({ canvas, pageState, gui }) => {
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
  const camera = new Camera(vec3.create(0, 0, -3), terrainQuad.center);
  camera.setAspectRatio(canvas.width / canvas.height);
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

  const offset = 256; // padding must be 256-byte aligned??
  const uniformBufferSize = offset +
    4 * 4 * 4 + // modelViewProjectionMatrix : mat4x4<f32>
    3 * 4 + // right : vec3<f32>
    4 + // padding
    3 * 4 + // up : vec3<f32>
    4 + // padding
    0;
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  //////////////////////////////////////////////////////////////////////////////
  // Texture
  //////////////////////////////////////////////////////////////////////////////

  // heightmap
  let response = await fetch('assets/heightfields/hfTest1.png');
  let imageBitmap = await createImageBitmap(await response.blob());
  const [srcWidth, srcHeight] = [imageBitmap.width, imageBitmap.height];

  // ping-pong buffers for 2d render
  const hfTextures = [0, 1].map(() => {
    return device.createTexture({
      size: [srcWidth, srcHeight, 1],
      mipLevelCount: 1,//numMipLevels,
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
    { texture: hfTextures[currSourceTexIndex] },
    [srcWidth, srcHeight]
  );

  // uplift texture
  response = await fetch('assets/uplifts/lambda.png');
  imageBitmap = await createImageBitmap(await response.blob());

  const upliftTexture = device.createTexture({
    size: [srcWidth, srcHeight, 1], // assuming same resolution as heightmap
    format: 'r8unorm', // greyscale can't be used with STORAGE_BINDING
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
    { texture: upliftTexture },
    [imageBitmap.width, imageBitmap.height]
  );

  // stream area map
  response = await fetch('assets/stream/streamInput.png');
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
  const computeBindGroup0 = device.createBindGroup({
    label: "compute bind group 0",
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
  });

  const computeBindGroup1 = device.createBindGroup({
    label: "compute bind group 1",
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
        resource: streamTextures[1].createView(),
      },
      {
        binding: 5,
        resource: streamTextures[0].createView(),
      },
    ],
  });

  const computeBindGroupArr = [computeBindGroup0, computeBindGroup1];

  terrainQuad.createBindGroup(terrainRenderPipeline, uniformBuffer, 0, sampler, hfTextures[currSourceTexIndex]);
  inputHeightmapDisplayQuad.createBindGroup(uiRenderPipeline, uniformBuffer, offset, sampler, hfTextures[currSourceTexIndex]);

  // hard-coded for milestone 1
  const simulationParams = {
    nx: 256,
    ny: 256,
    lowerVertX: -150.0 * 1000.0,
    lowerVertY: -150.0 * 1000.0,
    upperVertX: 150.0 * 1000.0,
    upperVertY: 150.0 * 1000.0,
    cellDiagX: 1176.47,
    cellDiagY: 1176.47,
  };
  device.queue.writeBuffer(
    simUnifBuffer,
    0,
    new Float32Array([
        simulationParams.nx, simulationParams.ny,
        simulationParams.lowerVertX, simulationParams.lowerVertY,
        simulationParams.upperVertX, simulationParams.upperVertY,
        simulationParams.cellDiagX, simulationParams.cellDiagY,
    ])
  );

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    // update camera
    mat4.identity(camera.viewMatrix);
    mat4.translate(camera.viewMatrix, camera.target, camera.viewMatrix);
    mat4.rotateX(camera.viewMatrix, Math.PI * -0.2, camera.viewMatrix);
    camera.update();

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
      writeMVPUniformBuffer(device, uniformBuffer, 0, terrainQuad.getModelMatrix(), camera.viewMatrix, camera.projectionMatrix);
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
      writeMVPUniformBuffer(device, uniformBuffer, offset, inputHeightmapDisplayQuad.getModelMatrix(), mat4.identity(), mat4.identity());
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
