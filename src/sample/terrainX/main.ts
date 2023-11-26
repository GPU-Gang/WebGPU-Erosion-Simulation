import { Mat4, mat4, vec3, vec4 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';
import Camera from '../camera';
import erosionWGSL from './erosion.wgsl';
import fullscreenTexturedWGSL from '../../shaders/fullscreenTexturedQuad.wgsl';
import Quad from './rendering/quad';

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
  //////////////////////////////////////////////////////////////////////////////
  // GUI Controls
  //////////////////////////////////////////////////////////////////////////////
  gui.width = 280;
  
  const guiInputs = {
    heightfield: heightfields[0],
    uplift: uplifts[0],
    customBrush: customBrushes[0],
  };

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
  // 2D Render Pipeline
  //////////////////////////////////////////////////////////////////////////////
  const renderPipeline = device.createRenderPipeline({
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

  let inputsChanged = false;
  const onChangeTextureHf = () => {
    let temp = hfTextures[currSourceTexIndex];
    hfTextures[currSourceTexIndex] = hfTextureArr[hfTextureAtlas[guiInputs.heightfield]];
    inputsChanged = true;
    console.log(`hf updated: ${temp.label}, ${hfTextures[currSourceTexIndex].label}`);
  };

  const onChangeTextureUplift = () => {
    let temp = upliftTexture;
    upliftTexture = upliftTextureArr[upliftTextureAtlas[guiInputs.uplift]];
    inputsChanged = true;
    console.log(`uplift updated: ${temp.label}, ${upliftTexture.label}`);
  };

  gui.add(guiInputs, 'heightfield', heightfields).onChange(onChangeTextureHf);
  gui.add(guiInputs, 'uplift', uplifts).onChange(onChangeTextureUplift);
  gui.add(guiInputs, 'customBrush', customBrushes);

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
  // const hfKeys = Object.keys(hfTextureAtlas).filter((v) => isNaN(Number(v)));
  // hfKeys.forEach(async (key, index) => {
  //   if (key != guiInputs.heightfield) {
  //     let response = await fetch(`${hfDir}${key}.png`);
  //     let imageBitmap = await createImageBitmap(await response.blob());
  //     let texture : GPUTexture;
  //     texture = createTextureFromImage(    
  //       device,
  //       texture,
  //       imageBitmap,
  //       false,
  //       false,
  //       `hf_${key}`
  //     );
  //     hfTextureArr.push(texture);
  //   }
  // });

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
  // const upliftKeys = Object.keys(upliftTextureAtlas).filter((v) => isNaN(Number(v)));
  // upliftKeys.forEach(async (key, index) => {
  //   if (key != guiInputs.uplift) {
  //     let response = await fetch(`${upliftDir}${key}.png`);
  //     let imageBitmap = await createImageBitmap(await response.blob());
  //     let texture : GPUTexture;
  //     texture = createTextureFromImage(    
  //       device,
  //       texture,
  //       imageBitmap,
  //       true,
  //       false,
  //       `uplift_${key}`
  //     );
  //     upliftTextureArr.push(texture);
  //   }
  // });

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
  let computeBindGroup0 = device.createBindGroup({
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

  let computeBindGroup1 = device.createBindGroup({
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

  let computeBindGroupArr = [computeBindGroup0, computeBindGroup1];

  terrainQuad.createBindGroup(renderPipeline, uniformBuffer, 0, sampler, hfTextures[currSourceTexIndex]);
  inputHeightmapDisplayQuad.createBindGroup(renderPipeline, uniformBuffer, offset, sampler, hfTextures[currSourceTexIndex]);

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

    // update bindGroups if input textures changed
    if (inputsChanged) {
      computeBindGroup0 = device.createBindGroup({
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
    
      computeBindGroup1 = device.createBindGroup({
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
    
      computeBindGroupArr = [computeBindGroup0, computeBindGroup1];
      console.log(`frame updated`);
    
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
      passEncoder.setPipeline(renderPipeline);
      
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
