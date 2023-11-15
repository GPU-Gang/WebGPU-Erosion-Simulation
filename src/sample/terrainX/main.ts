import { mat4, vec3 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';

import erosionWGSL from './erosion.wgsl';
import fullscreenTexturedWGSL from '../../shaders/fullscreenTexturedQuad.wgsl';

let currSourceTexIndex = 0;

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

  //TODO: From particles sample - Not sure if we need this but leaving in case needed for rendering SDF terrain
/*  const renderPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({
        code: particleWGSL,  //will need to be replaced by our own vert shader
      }),
      entryPoint: 'vs_main',
      buffers: [
        {
          // instanced particles buffer
          arrayStride: particleInstanceByteSize,
          stepMode: 'instance',
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: particlePositionOffset,
              format: 'float32x3',
            },
            {
              // color
              shaderLocation: 1,
              offset: particleColorOffset,
              format: 'float32x4',
            },
          ],
        },
        {
          // quad vertex buffer
          arrayStride: 2 * 4, // vec2<f32>
          stepMode: 'vertex',
          attributes: [
            {
              // vertex positions
              shaderLocation: 2,
              offset: 0,
              format: 'float32x2',
            },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({
        code: particleWGSL, //will need to be replaced by our own fragment shader
      }),
      entryPoint: 'fs_main',
      targets: [
        {
          format: presentationFormat,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'zero',
              dstFactor: 'one',
              operation: 'add',
            },
          },
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },

    depthStencil: {
      depthWriteEnabled: false,
      depthCompare: 'less',
      format: 'depth24plus',
    },
  });*/

  //////////////////////////////////////////////////////////////////////////////
  // 2D Texture Render Pipeline
  //////////////////////////////////////////////////////////////////////////////
  const fullscreenTexturePipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({
        code: fullscreenTexturedWGSL,
      }),
      entryPoint: 'vert_main',
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
    },
  });

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

/*  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined, // Assigned later
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      view: depthTexture.createView(),

      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };
*/

  //////////////////////////////////////////////////////////////////////////////
  // Quad vertex buffer
  //////////////////////////////////////////////////////////////////////////////
  const quadVertexBuffer = device.createBuffer({
    size: 6 * 2 * 4, // 6x vec2<f32>
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  // prettier-ignore
  const vertexData = [
    -1.0, -1.0, +1.0, -1.0, -1.0, +1.0, -1.0, +1.0, +1.0, -1.0, +1.0, +1.0,
  ];
  new Float32Array(quadVertexBuffer.getMappedRange()).set(vertexData);
  quadVertexBuffer.unmap();

  //////////////////////////////////////////////////////////////////////////////
  // Texture
  //////////////////////////////////////////////////////////////////////////////

  // heightmap
  var response = await fetch('assets/img/hfTest2.png');
  var imageBitmap = await createImageBitmap(await response.blob());
  const [srcWidth, srcHeight] = [imageBitmap.width, imageBitmap.height];

  // ping-pong buffers
  const textures = [0, 1].map(() => {
    return device.createTexture({
      size: [srcWidth, srcHeight, 1],
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
    { texture: textures[currSourceTexIndex] },
    [srcWidth, srcHeight]
  );

    // heightmap
    var response = await fetch('assets/img/stream.png');
    var imageBitmap2 = await createImageBitmap(await response.blob());
    const [srcWidth2, srcHeight2] = [imageBitmap2.width, imageBitmap2.height];
  
    // ping-pong buffers
    const textures2 = [0, 1].map(() => {
      return device.createTexture({
        size: [srcWidth2, srcHeight2, 1],
        format: 'rgba8unorm',
        usage:
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.STORAGE_BINDING |
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
    });
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap2 },
      { texture: textures2[currSourceTexIndex] },
      [srcWidth2, srcHeight2]
    );

    // uplift texture
    response = await fetch('assets/uplifts/alpes_noise.png');
    imageBitmap = await createImageBitmap(await response.blob());

    const upliftTexture = device.createTexture({
      size: [srcWidth, srcHeight, 1],
      format: 'r8unorm',
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
        resource: textures[0].createView(),
      },
      {
        binding: 2,
        resource: textures[1].createView(),
      },
      {
        binding: 3,
        resource: upliftTexture.createView(),
      },
      {
        binding: 4,
        resource: textures2[0].createView(),
      },
      {
        binding: 5,
        resource: textures2[1].createView(),
      }
    ],
  });

  const computeBindGroup1 = device.createBindGroup({
    label: "compute bind group 1",
    layout: erosionComputePipeline.getBindGroupLayout(1),
    entries: [
      {
        binding: 1,
        resource: textures[1].createView(),
      },
      {
        binding: 2,
        resource: textures[0].createView(),
      },
      {
        binding: 3,
        resource: upliftTexture.createView(),
      },
      {
        binding: 4,
        resource: textures2[1].createView(),
      },
      {
        binding: 5,
        resource: textures2[0].createView(),
      }
    ],
  });

  const computeBindGroupArr = [computeBindGroup0, computeBindGroup1];


  const show2DRenderBindGroup = device.createBindGroup({
    layout: fullscreenTexturePipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: sampler,
      },
      {
        binding: 1,
        resource: textures[currSourceTexIndex].createView(),
      },
    ],
  });

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

    const commandEncoder = device.createCommandEncoder();
    //compute pass goes in the following stub
    {
      const computePass = commandEncoder.beginComputePass();
      computePass.setPipeline(erosionComputePipeline);
      computePass.setBindGroup(0, simulationConstants);
      computePass.setBindGroup(1, computeBindGroupArr[currSourceTexIndex]);
      computePass.dispatchWorkgroups(
        Math.ceil(srcWidth),
        Math.ceil(srcHeight)
      );
      computePass.end();
      currSourceTexIndex = (currSourceTexIndex + 1) % 2;
    }
    //full screen quad render pass goes in the following stub
    {
      const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      });
      passEncoder.setPipeline(fullscreenTexturePipeline);
      passEncoder.setBindGroup(0, show2DRenderBindGroup);
      passEncoder.draw(6);
      passEncoder.end();
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
