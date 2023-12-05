import mipmapWGSL from '../../shaders/generateMipmaps.wgsl';

export const generateMips = (() => {
  let sampler;
  let mipModule;
  const pipelineByFormat = {};

  return function generateMips(device, texture) {
    if (!mipModule) {
      mipModule = device.createShaderModule({
        label: 'textured quad shaders for mip level generation',
        code: mipmapWGSL,
      });
 
      //We'll ALWAYS be rendering minified here, so that's the only filter mode we need to set.
      sampler = device.createSampler({
        minFilter: 'linear',
      });
    }
 
    if (!pipelineByFormat[texture.format]) {
      pipelineByFormat[texture.format] = device.createRenderPipeline({
        label: 'mip level generator pipeline',
        layout: 'auto',
        vertex: {
          mipModule,
          entryPoint: 'vertexMain',
        },
        fragment: {
          mipModule,
          entryPoint: 'fragmentMain',
          targets: [{ format: texture.format }], // Make sure to use the same format as the texture
        },
        primitive: {
          topology: 'triangle-strip',
          stripIndexFormat: 'uint32',
        },
      });
    }
    const pipeline = pipelineByFormat[texture.format];
 
    const encoder = device.createCommandEncoder({
      label: 'mip gen encoder',
    });
 
    let width = texture.width;
    let height = texture.height;
    let baseMipLevel = 0;
    // Loop through each mip level and renders the previous level's contents into it.
    while (width > 1 || height > 1) {
        width = Math.max(1, width / 2 | 0);
        height = Math.max(1, height / 2 | 0);
 
        const bindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: sampler },
            { binding: 1, resource: texture.createView({baseMipLevel, mipLevelCount: 1}) },
          ],
        });
 
        ++baseMipLevel;
 
        const renderPassDescriptor = {
          label: 'mip gen canvas renderPass',
          colorAttachments: [
            {
              view: texture.createView({baseMipLevel, mipLevelCount: 1}),
              loadOp: 'clear',
              storeOp: 'store',
            },
          ],
        };
 
        // Render
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(4);  // call our vertex shader 4 times
        pass.end();
    }
 
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  };
})();

export function copySourceToTexture(device, texture, source, {flipY}) {
  device.queue.copyExternalImageToTexture(
    { source, flipY, },
    { texture },
    { width: source.width, height: source.height },
  );
 
  if (texture.mipLevelCount > 1) {
    generateMips(device, texture);
  }
}

const numMipLevels = (...sizes) => {
  const maxSize = Math.max(...sizes);
  return 1 + Math.log2(maxSize) | 0;
};

export function createTextureFromSource(device, url, source, options) {
  const texture = device.createTexture({
    label: url,
    format: 'rgba8unorm',
    mipLevelCount: options.mips ? numMipLevels(source.width, source.height) : 1,
    size: [source.width, source.height],
    usage: GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
  });
  console.log("mip count: "+texture.mipLevelCount);
  copySourceToTexture(device, texture, source, options.flipY ? options.flipY : false);
  return texture;
}

async function loadImageBitmap(url) {
    const res = await fetch(url);
    const blob = await res.blob();
    return await createImageBitmap(blob, { colorSpaceConversion: 'none' });
}

export async function createTextureFromImageWithMip(device, url, options) {
  const imgBitmap = await loadImageBitmap(url);
  return createTextureFromSource(device, url, imgBitmap, options);
}