import { vec2 } from "wgpu-matrix";

abstract class Drawable {
  count: number = 0;

  indexBuffer: GPUBuffer;
  posBuffer: GPUBuffer;
  normalBuffer: GPUBuffer;
  uvBuffer: GPUBuffer;
  
  idxBound: boolean = false;
  posBound: boolean = false;
  norBound: boolean = false;
  uvBound: boolean = false;

  indices: Uint32Array;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;

  device: GPUDevice;

  create(device: GPUDevice) : void
  {
    this.device = device;
  }

  createIndexBuffer(): GPUBuffer 
  {
    if (!this.idxBound)
    {
        this.idxBound = true;
        this.indexBuffer = this.device.createBuffer({
            size: this.indices.byteLength,
            usage: GPUBufferUsage.INDEX,
            mappedAtCreation: true
        });
    
        new Uint32Array(this.indexBuffer.getMappedRange()).set(this.indices);
        this.indexBuffer.unmap();
    }

    return this.indexBuffer;
  }

  createPosBuffer(): GPUBuffer
  {
    if (!this.posBound)
    {
        this.posBound = true;
        this.posBuffer = this.device.createBuffer({
            size: this.positions.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true
        });
    
        new Float32Array(this.posBuffer.getMappedRange()).set(this.positions);
        this.posBuffer.unmap();
    }

    return this.posBuffer;
  }

  createNormalBuffer(): GPUBuffer {
    if (!this.norBound)
    {
        this.norBound = true;
        this.normalBuffer = this.device.createBuffer({
            size: this.normals.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true
        });
    
        new Float32Array(this.normalBuffer.getMappedRange()).set(this.normals);
        this.normalBuffer.unmap();
    }

    return this.normalBuffer;
  }

  createUVBuffer(): GPUBuffer {
    if (!this.uvBound)
    {
        this.uvBound = true;
        this.uvBuffer = this.device.createBuffer({
            size: this.uvs.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true
        });
    
        new Float32Array(this.uvBuffer.getMappedRange()).set(this.uvs);
        this.uvBuffer.unmap();
    }

    return this.uvBuffer;
  }

  elemCount(): number {
    return this.count;
  }
};

export default Drawable;