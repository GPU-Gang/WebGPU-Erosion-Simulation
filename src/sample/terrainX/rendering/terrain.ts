import { mat4, Vec3, vec3, vec4, Vec4 } from 'wgpu-matrix';
import Quad from './quad';


class TerrainQuad extends Quad {
  createTerrainBindGroup(pipeline: GPURenderPipeline, uniformBuffer: GPUBuffer,
                  bufferOffset: number, sampler: GPUSampler, texture: GPUTexture,
                  terrainBuffer: GPUBuffer)
  {
    if (!this.bindGroupCreated)
    {
        this.bindGroupCreated = true;
        this.bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
              {
                binding: 0,
                resource: {
                  buffer: uniformBuffer,
                  offset: bufferOffset
                },
              },
              {
                binding: 1,
                resource: sampler,
              },
              {
                binding: 2,
                resource: texture.createView(),
              },
              {
                binding: 3,
                resource:{
                    buffer: terrainBuffer,
                    offset: 0
                }
              }
            ],
          });
    }

    return this.bindGroup;
  }

};

export default TerrainQuad;