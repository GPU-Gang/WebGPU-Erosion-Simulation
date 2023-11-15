import { vec4, Vec4 } from 'wgpu-matrix';
import Drawable from './drawable';

class Quad extends Drawable {
  center: Vec4;

  constructor(center: Vec4) {
    super(); // Call the constructor of the super class. This is required.
    this.center = vec4.fromValues(center[0], center[1], center[2], 1);
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
      -1, 1, 0, 1,
      1, 1, 0, 1,
      1, -1, 0, 1]);

    this.uvs = new Float32Array([0, 0,
        1,0,
        1,1,
        0,1])

    this.count = this.indices.length;

    this.createIndexBuffer();
    this.createPosBuffer();
    this.createNormalBuffer();
    this.createUVBuffer();

    console.log(`Created quad`);
  }
};

export default Quad;