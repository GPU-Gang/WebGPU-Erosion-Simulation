import { mat4, vec3 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';

import particleWGSL from './particle.wgsl'; //TODO: to be removed/replaced by our own vert/frag shader for SDF terrain
import erosionWGSL from './erosion.wgsl';
import fullscreenTexturedWGSL from '../../shaders/fullscreenTexturedQuad.wgsl';

const particlePositionOffset = 0;
const particleColorOffset = 4 * 4;
const particleInstanceByteSize =
  3 * 4 + // position
  1 * 4 + // lifetime
  4 * 4 + // color
  3 * 4 + // velocity
  1 * 4 + // padding
  0;

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
  const renderPipeline = device.createRenderPipeline({
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
  });

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

//////////////////////////////////////////////////////////////////////////////
//TODO: From particles sample - Not sure if we need this but leaving in case needed for rendering SDF terrain
  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const uniformBufferSize =
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

  const uniformBindGroup = device.createBindGroup({
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
    ],
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
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
  const response = await fetch('assets/img/terrainXLogo.png');
  const imageBitmap = await createImageBitmap(await response.blob());
  const [srcWidth, srcHeight] = [imageBitmap.width, imageBitmap.height];

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
  
  //TODO: our uniforms would *probably* go here but not sure
  // const computeConstants = device.createBindGroup({
  //   layout: erosionComputePipeline.getBindGroupLayout(0),
  //   entries: [
  //     {
  //       binding: 0,
  //       resource: sampler,
  //     },
  //   ],
  // });

  const computeBindGroup0 = device.createBindGroup({
    layout: erosionComputePipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 1,
        resource: textures[0].createView(),
      },
      {
        binding: 2,
        resource: textures[1].createView(),
      },
    ],
  });

  const computeBindGroup1 = device.createBindGroup({
    layout: erosionComputePipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 1,
        resource: textures[1].createView(),
      },
      {
        binding: 2,
        resource: textures[0].createView(),
      },
    ],
  });

  let computeBindGroupArr = [computeBindGroup0, computeBindGroup1];


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

  const aspect = canvas.width / canvas.height;
  const projection = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
  const view = mat4.create();
  const mvp = mat4.create();

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;


    //TODO: From particles sample - Not sure if we need this but leaving in case needed for the camera to work
    mat4.identity(view);
    mat4.translate(view, vec3.fromValues(0, 0, -3), view);
    mat4.rotateX(view, Math.PI * -0.2, view);
    mat4.multiply(projection, view, mvp);

    //TODO: From particles sample - Not sure if we need this but leaving in case needed for the camera to work
    // prettier-ignore
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      new Float32Array([
        // modelViewProjectionMatrix
        mvp[0], mvp[1], mvp[2], mvp[3],
        mvp[4], mvp[5], mvp[6], mvp[7],
        mvp[8], mvp[9], mvp[10], mvp[11],
        mvp[12], mvp[13], mvp[14], mvp[15],

        view[0], view[4], view[8], // right

        0, // padding

        view[1], view[5], view[9], // up

        0, // padding
      ])
    );

    const commandEncoder = device.createCommandEncoder();
    //compute pass goes in the following stub
    {
      const computePass = commandEncoder.beginComputePass();
      computePass.setPipeline(erosionComputePipeline);
      //computePass.setBindGroup(0, computeConstants);
      computePass.setBindGroup(0, computeBindGroupArr[currSourceTexIndex]);
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
