import { mat4, Vec3, vec3, vec4, Vec4 } from 'wgpu-matrix';
import Drawable from './drawable';
import { off } from 'process';

class Quad extends Drawable {
  center: Vec4;
  scale: Vec3;
  rotation: Vec3;

  bindGroupCreated: boolean = false;
  bindGroup: GPUBindGroup;

  constructor(center: Vec4 = vec4.create(0,0,0,0),
              scale: Vec3 = vec3.create(1,1,1),
              rotation: Vec3 = vec3.create(0,0,0))
   {
    super(); // Call the constructor of the super class. This is required.
    this.center = vec4.fromValues(center[0], center[1], center[2], 1);
    this.scale = scale;
    this.rotation = rotation;
   }

  create(device: GPUDevice) {
    super.create(device);

    this.indices = new Uint32Array([0, 1, 2,
                                    0, 2, 3]);
    this.normals = new Float32Array([0, 0, 1, 0,
                                    0, 0, 1, 0,
                                    0, 0, 1, 0,
                                    0, 0, 1, 0]);
                                   
    this.positions = new Float32Array([-1, -1, 0, 1,
      1, -1, 0, 1,
      1, 1, 0, 1,
      -1, 1, 0, 1]);

    this.uvs = new Float32Array([0,1,
        1,1,
        1,0,
        0,0])

    this.count = this.indices.length;

    this.createIndexBuffer();
    this.createPosBuffer();
    this.createNormalBuffer();
    this.createUVBuffer();

    console.log(`Created quad`);
  }

  createBindGroup(pipeline: GPURenderPipeline, uniformBuffer: GPUBuffer,
                  bufferOffset: number, sampler: GPUSampler, texture: GPUTexture)
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
            ],
          });    
    }

    return this.bindGroup;
  }

  getModelMatrix()
  {
    let model = mat4.identity();
    mat4.rotateX(model, this.rotation[0], model);
    mat4.rotateY(model, this.rotation[1], model);
    mat4.rotateZ(model, this.rotation[2], model);
    mat4.scale(model, this.scale, model);
    mat4.translate(model, this.center, model);
    return model;
  }
};

export default Quad;