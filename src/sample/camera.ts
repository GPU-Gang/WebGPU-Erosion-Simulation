var CameraControls = require('3d-view-controls');
import { vec2, mat4, Mat4, Vec3, Vec2, vec3 } from "wgpu-matrix";

class Camera {
  controls: any;
  projectionMatrix: Mat4 = mat4.create();
  fovy: number = 45;
  aspectRatio: number = 1;
  near: number = 0.1;
  far: number = 1000000;
  resolution: Vec2 = vec2.create(400,400);
  right: Vec3 = vec3.create(1,0,0);
  up: Vec3 = vec3.create(0,1,0);
  forward: Vec3 = vec3.create(0,0,1);

  constructor(position: Vec3, target: Vec3) {
    this.controls = CameraControls(document.getElementById('canvas'), {
      eye: position,
      center: target,
      translateSpeed: -1,   // flip the translation so it matches the standard :)
      mode: "orbit",        // default mode. if we switch this to "matrix" we can get rid of our hacki-ness but will have to do a lot of custom view matrix calculation
    });

    // flip rotations so it matches the standard :)
    this.controls.flipX = true;
    this.controls.flipY = true;

    // flip rotation on the X axis also because this camera system is really weiiiiird :)
    this.controls.rotate(0,3.14159,0);
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

    // Update coordinate axes
    const viewMatrix = this.viewMatrix();

    // I have no idea why the view matrix from this package has negated values for right and forward vectors :)
    this.right[0] = -viewMatrix[0];
    this.right[1] = -viewMatrix[4];
    this.right[2] = -viewMatrix[8];

    this.up[0] = viewMatrix[1];
    this.up[1] = viewMatrix[5];
    this.up[2] = viewMatrix[9];

    this.forward[0] = -viewMatrix[2];
    this.forward[1] = -viewMatrix[6];
    this.forward[2] = -viewMatrix[10];
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