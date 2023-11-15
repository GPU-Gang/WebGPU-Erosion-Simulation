import { Mat4, mat4, vec3, vec4 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';
import Camera from '../camera';
import particleWGSL from './particle.wgsl';
import probabilityMapWGSL from './probabilityMap.wgsl';
import fullscreenTexturedWGSL from '../../shaders/fullscreenTexturedQuad.wgsl';
import Quad from './rendering/quad';

const numParticles = 50000;
const particlePositionOffset = 0;
const particleColorOffset = 4 * 4;
const particleInstanceByteSize =
  3 * 4 + // position
  1 * 4 + // lifetime
  4 * 4 + // color
  3 * 4 + // velocity
  1 * 4 + // padding
  0;

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

  const particlesBuffer = device.createBuffer({
    size: numParticles * particleInstanceByteSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
  });

  const renderPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({
        code: particleWGSL,
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
        code: particleWGSL,
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

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });
//////////////////////////////////////////////////////////////////////////////

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
  // Texture
  //////////////////////////////////////////////////////////////////////////////
  let texture: GPUTexture;
  let textureWidth = 1;
  let textureHeight = 1;
  let numMipLevels = 1;
  let [srcWidth, srcHeight] = [1, 1];
  {
    const response = await fetch('assets/img/terrainXLogo.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    [srcWidth, srcHeight] = [imageBitmap.width, imageBitmap.height];

    // Calculate number of mip levels required to generate the probability map
    while (
      textureWidth < imageBitmap.width ||
      textureHeight < imageBitmap.height
    ) {
      textureWidth *= 2;
      textureHeight *= 2;
      numMipLevels++;
    }
    texture = device.createTexture({
      size: [srcWidth, srcHeight, 1],
      mipLevelCount: numMipLevels,
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: texture },
      [srcWidth, srcHeight]
    );
  }

  // ping-pong buffers for later?
  // const textures = [0, 1].map(() => {
  //   return device.createTexture({
  //     size: {
  //       width: srcWidth,
  //       height: srcHeight,
  //     },
  //     format: 'rgba8unorm',
  //     usage:
  //       GPUTextureUsage.COPY_DST |
  //       GPUTextureUsage.STORAGE_BINDING |
  //       GPUTextureUsage.TEXTURE_BINDING,
  //   });
  // });

  //////////////////////////////////////////////////////////////////////////////
  // Probability map generation
  // The 0'th mip level of texture holds the color data and spawn-probability in
  // the alpha channel. The mip levels 1..N are generated to hold spawn
  // probabilities up to the top 1x1 mip level.
  //////////////////////////////////////////////////////////////////////////////
  {
    const probabilityMapImportLevelPipeline = device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: device.createShaderModule({ code: probabilityMapWGSL }),
        entryPoint: 'import_level',
      },
    });
    const probabilityMapExportLevelPipeline = device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: device.createShaderModule({ code: probabilityMapWGSL }),
        entryPoint: 'export_level',
      },
    });

    const probabilityMapUBOBufferSize =
      1 * 4 + // stride
      3 * 4 + // padding
      0;
    const probabilityMapUBOBuffer = device.createBuffer({
      size: probabilityMapUBOBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const buffer_a = device.createBuffer({
      size: textureWidth * textureHeight * 4,
      usage: GPUBufferUsage.STORAGE,
    });
    const buffer_b = device.createBuffer({
      size: textureWidth * textureHeight * 4,
      usage: GPUBufferUsage.STORAGE,
    });
    device.queue.writeBuffer(
      probabilityMapUBOBuffer,
      0,
      new Int32Array([textureWidth])
    );
    const commandEncoder = device.createCommandEncoder();
    for (let level = 0; level < numMipLevels; level++) {
      const levelWidth = textureWidth >> level;
      const levelHeight = textureHeight >> level;
      const pipeline =
        level == 0
          ? probabilityMapImportLevelPipeline.getBindGroupLayout(0)
          : probabilityMapExportLevelPipeline.getBindGroupLayout(0);
      const probabilityMapBindGroup = device.createBindGroup({
        layout: pipeline,
        entries: [
          {
            // ubo
            binding: 0,
            resource: { buffer: probabilityMapUBOBuffer },
          },
          {
            // buf_in
            binding: 1,
            resource: { buffer: level & 1 ? buffer_a : buffer_b },
          },
          {
            // buf_out
            binding: 2,
            resource: { buffer: level & 1 ? buffer_b : buffer_a },
          },
          {
            // tex_in / tex_out
            binding: 3,
            resource: texture.createView({
              format: 'rgba8unorm',
              dimension: '2d',
              baseMipLevel: level,
              mipLevelCount: 1,
            }),
          },
        ],
      });
      if (level == 0) {
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(probabilityMapImportLevelPipeline);
        passEncoder.setBindGroup(0, probabilityMapBindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(levelWidth / 64), levelHeight);
        passEncoder.end();
      } else {
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(probabilityMapExportLevelPipeline);
        passEncoder.setBindGroup(0, probabilityMapBindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(levelWidth / 64), levelHeight);
        passEncoder.end();
      }
    }
    device.queue.submit([commandEncoder.finish()]);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Simulation compute pipeline
  //////////////////////////////////////////////////////////////////////////////
  const simulationParams = {
    simulate: true,
    deltaTime: 0.04,
    render2D: false,
  };

  const simulationUBOBufferSize =
    1 * 4 + // deltaTime
    3 * 4 + // padding
    4 * 4 + // seed
    0;
  const simulationUBOBuffer = device.createBuffer({
    size: simulationUBOBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  Object.keys(simulationParams).forEach((k) => {
    gui.add(simulationParams, k);
  });

  const computePipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: device.createShaderModule({
        code: particleWGSL,
      }),
      entryPoint: 'simulate',
    },
  });
  const computeBindGroup = device.createBindGroup({
    layout: computePipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: simulationUBOBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: particlesBuffer,
          offset: 0,
          size: numParticles * particleInstanceByteSize,
        },
      },
      {
        binding: 2,
        resource: texture.createView(),
      },
    ],
  });

  terrainQuad.createBindGroup(fullscreenTexturePipeline, uniformBuffer, 0, sampler, texture);
  inputHeightmapDisplayQuad.createBindGroup(fullscreenTexturePipeline, uniformBuffer, offset, sampler, texture);

  const camera = new Camera(vec3.create(0, 0, -3), terrainQuad.center);
  camera.setAspectRatio(canvas.width / canvas.height);
  camera.updateProjectionMatrix();

  const mvp = mat4.create();

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    device.queue.writeBuffer(
      simulationUBOBuffer,
      0,
      new Float32Array([
        simulationParams.simulate ? simulationParams.deltaTime : 0.0,
        0.0,
        0.0,
        0.0, // padding
        Math.random() * 100,
        Math.random() * 100, // seed.xy
        1 + Math.random(),
        1 + Math.random(), // seed.zw
      ])
    );

    mat4.identity(camera.viewMatrix);
    mat4.translate(camera.viewMatrix, camera.target, camera.viewMatrix);
    mat4.rotateX(camera.viewMatrix, Math.PI * -0.2, camera.viewMatrix);
    camera.update();

    // prettier-ignore
    writeMVPUniformBuffer(device, uniformBuffer, 0, mat4.identity(), camera.viewMatrix, camera.projectionMatrix);
    const swapChainTexture = context.getCurrentTexture();
    // prettier-ignore
    renderPassDescriptor.colorAttachments[0].view = swapChainTexture.createView();

    const commandEncoder = device.createCommandEncoder();
    {
      const computePass = commandEncoder.beginComputePass();
      computePass.setPipeline(computePipeline);
      computePass.setBindGroup(0, computeBindGroup);
      computePass.dispatchWorkgroups(Math.ceil(numParticles / 64));
      computePass.end();
    }
    {
      if (simulationParams.render2D) {
        const passEncoder = commandEncoder.beginRenderPass({
          colorAttachments: [
            {
              view: renderPassDescriptor.colorAttachments[0].view,
              clearValue: { r: 0.0, g: 0.0, b: 0.2, a: 1.0 },
              loadOp: 'clear',
              storeOp: 'store',
            },
          ],
        });
        passEncoder.setPipeline(fullscreenTexturePipeline);

        // Draw main quad (terrain)
        writeMVPUniformBuffer(device, uniformBuffer, 0, terrainQuad.getModelMatrix(), camera.viewMatrix, camera.projectionMatrix);
        passEncoder.setBindGroup(0, terrainQuad.bindGroup);
        passEncoder.setIndexBuffer(terrainQuad.indexBuffer, "uint32");
        passEncoder.setVertexBuffer(0, terrainQuad.posBuffer);
        passEncoder.setVertexBuffer(1, terrainQuad.normalBuffer);
        passEncoder.setVertexBuffer(2, terrainQuad.uvBuffer);
        passEncoder.drawIndexed(terrainQuad.count);

        // Draw input texture as UI
        writeMVPUniformBuffer(device, uniformBuffer, offset, inputHeightmapDisplayQuad.getModelMatrix(), mat4.identity(), mat4.identity());
        passEncoder.setBindGroup(0, inputHeightmapDisplayQuad.bindGroup);
        passEncoder.setIndexBuffer(inputHeightmapDisplayQuad.indexBuffer, "uint32");
        passEncoder.setVertexBuffer(0, inputHeightmapDisplayQuad.posBuffer);
        passEncoder.setVertexBuffer(1, inputHeightmapDisplayQuad.normalBuffer);
        passEncoder.setVertexBuffer(2, inputHeightmapDisplayQuad.uvBuffer);
        passEncoder.drawIndexed(inputHeightmapDisplayQuad.count);

        passEncoder.end();
      }
      else {
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

        passEncoder.setPipeline(renderPipeline);
        passEncoder.setBindGroup(0, uniformBindGroup);
        passEncoder.setVertexBuffer(0, particlesBuffer);
        // passEncoder.setVertexBuffer(1, quadVertexBuffer);
        // passEncoder.draw(6, numParticles, 0, 0);
        passEncoder.end();
      }
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
