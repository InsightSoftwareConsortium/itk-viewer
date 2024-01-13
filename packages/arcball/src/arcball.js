'use strict';
// File modified from https://github.com/mikolalysenko/orbit-camera

import * as glm from 'gl-matrix';
var vec3 = glm.vec3;
var mat3 = glm.mat3;
var mat4 = glm.mat4;
var quat = glm.quat;

//Scratch variables
var scratch0 = new Float32Array(16);
var scratch1 = new Float32Array(16);

function ArcballCamera(rotation, center, distance) {
  this.rotation = rotation;
  this.center = center;
  this.distance = distance;
}

var proto = ArcballCamera.prototype;

proto.view = function (out) {
  if (!out) {
    out = mat4.create();
  }
  scratch1[0] = scratch1[1] = 0.0;
  scratch1[2] = -this.distance;
  mat4.fromRotationTranslation(
    out,
    quat.conjugate(scratch0, this.rotation),
    scratch1,
  );
  mat4.translate(out, out, vec3.negate(scratch0, this.center));
  return out;
};

proto.lookAt = function (eye, center, up) {
  mat4.lookAt(scratch0, eye, center, up);
  mat3.fromMat4(scratch0, scratch0);
  quat.fromMat3(this.rotation, scratch0);
  vec3.copy(this.center, center);
  this.distance = vec3.distance(eye, center);
};

proto.pan = function (dpan) {
  var d = this.distance;
  scratch0[0] = -d * (dpan[0] || 0);
  scratch0[1] = d * (dpan[1] || 0);
  scratch0[2] = d * (dpan[2] || 0);
  vec3.transformQuat(scratch0, scratch0, this.rotation);
  vec3.add(this.center, this.center, scratch0);
};

proto.zoom = function (d) {
  this.distance += d;
  if (this.distance < 0.0) {
    this.distance = 0.0;
  }
};

function quatFromVec(out, da) {
  var x = da[0];
  var y = -da[1];
  var s = Math.sqrt(x * x + y * y);
  if (s > 1.0) {
    s = 1.0;
  }
  out[0] = x;
  out[1] = y;
  out[2] = Math.sqrt(1.0 - s);
  out[3] = 0.0;
}

proto.rotate = function (da, db) {
  quatFromVec(scratch0, da);
  quatFromVec(scratch1, db);

  quat.normalize(scratch0, scratch0);
  quat.normalize(scratch1, scratch1);

  quat.conjugate(scratch0, scratch0);
  quat.multiply(scratch0, scratch1, scratch0);
  if (quat.length(scratch0) < 1e-6) {
    return;
  }

  quat.normalize(scratch0, scratch0);
  quat.multiply(this.rotation, this.rotation, scratch0);
  quat.normalize(this.rotation, this.rotation);
};

export function createArcballCamera(eye, target, up) {
  eye = eye || [0, 0, -1];
  target = target || [0, 0, 0];
  up = up || [0, 1, 0];
  var camera = new ArcballCamera(quat.create(), vec3.create(), 1.0);
  camera.lookAt(eye, target, up);
  return camera;
}
