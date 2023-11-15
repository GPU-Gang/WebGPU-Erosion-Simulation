var CameraControls = require('3d-view-controls');
import { vec3, mat4, Mat4, Vec3 } from "wgpu-matrix";

class Camera {
  controls: any;
  projectionMatrix: Mat4 = mat4.create();
  viewMatrix: Mat4 = mat4.create();
  fovy: number = 45;
  aspectRatio: number = 1;
  near: number = 0.1;
  far: number = 1000;
  position: Vec3 = vec3.create();
  direction: Vec3 = vec3.create();
  target: Vec3 = vec3.create();
  up: Vec3 = vec3.create();

  constructor(position: Vec3, target: Vec3) {
    this.controls = CameraControls(document.getElementById('canvas'), {
      eye: position,
      center: target,
    });
    this.position = position;
  }

  setAspectRatio(aspectRatio: number) {
    this.aspectRatio = aspectRatio;
  }

  updateProjectionMatrix() {
    mat4.perspective(this.fovy, this.aspectRatio, this.near, this.far, this.projectionMatrix);
  }

  setPosition(position: Vec3)
  {
    // Calculate the offset between the new camera position and the current camera position.
    const offset = vec3.fromValues(position[0] - this.position[0], position[1] - this.position[1],  position[2] - this.position[2]);

    this.controls.pan(offset[0], offset[1], offset[2]);
    this.position = position;
  }

  update(shakeNoise: Vec3 = vec3.create(0,0,0)) {
    this.controls.tick();
    vec3.add(this.position, this.direction, this.target);
    const actualEye = vec3.create();
    vec3.subtract(this.controls.eye, shakeNoise, actualEye);
    mat4.lookAt(actualEye , this.controls.center, this.controls.up, this.viewMatrix);
  }
};

export default Camera;