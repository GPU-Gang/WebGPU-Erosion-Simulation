var CameraControls = require('3d-view-controls');
import { vec2, mat4, Mat4, Vec3, Vec2 } from "wgpu-matrix";

class Camera {
  controls: any;
  projectionMatrix: Mat4 = mat4.create();
  fovy: number = 45;
  aspectRatio: number = 1;
  near: number = 0.1;
  far: number = 1000;
  resolution: Vec2 = vec2.create(400,400);

  constructor(position: Vec3, target: Vec3) {
    this.controls = CameraControls(document.getElementById('canvas'), {
      eye: position,
      center: target,
    });
  }

  setResolution(resolution: Vec2) {
    this.resolution = resolution;
    this.aspectRatio = resolution[0] / resolution[1];
  }

  updateProjectionMatrix() {
    mat4.perspective(this.fovy, this.aspectRatio, this.near, this.far, this.projectionMatrix);
  }

  update() {
    this.controls.tick();
  }

  viewMatrix()
  {
    return this.controls.matrix;
  }

  getPosition()
  {
    return this.controls.eye;
  }

};

export default Camera;