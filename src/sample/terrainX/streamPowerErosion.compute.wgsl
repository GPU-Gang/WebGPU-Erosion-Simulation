////////////////////////////////////////////////////////////////////////////////
// Simulation Compute shader
////////////////////////////////////////////////////////////////////////////////

struct SimulationParams {
  nx        : i32,    // array dimension
  ny        : i32,
  lowerVert : vec2f,  // lower and upper vertices of the box of the heightfield
  upperVert : vec2f,
  cellDiag  : vec2f,  // cell diagonal
}

// Uniforms
@group(0) @binding(0) var<uniform> simParams : SimulationParams;

// In
@group(1) @binding(0) var<storage, read> inElevation : array<f32>; // aka heightfield
@group(1) @binding(1) var<storage, read> inStreamArea: array<f32>;

// Out
@group(1) @binding(2) var<storage, write> outElevation : array<f32>; // texture_2d?
@group(1) @binding(3) var<storage, write> outStreamArea : array<f32>;

@group(1) @binding(4) var<storage, read> upliftBuffer : array<f32>;

// ----------- Global parameters -----------
// 0: Stream power
// TODO 1: Stream power + Hillslope (Laplacian)
// TODO 2: Stream power + Hillslope (Laplacian) + Debris slope
const erosionMode : i32 = 0;

const uplift : f32 = 0.01;
const k : f32 = 0.0005;
const k_d : f32 = 10.0;
const k_h : f32 = 2.0;
const p_sa : f32 = 0.8;
const p_sl : f32 = 2.0;
const dt : f32 = 100.0;

// next 8 neighboring cells
const neighbors : array<vec2i, 8> = array<vec2i, 8>(
  vec2i(0, 1), vec2i(1, 1), 
  vec2i(1, 0), vec2i(1, -1), 
  vec2i(0, -1), vec2i(-1, -1), 
  vec2i(-1, 0), vec2i(-1, 1)
);

// ----------- Utilities -----------
fn ToIndex1D(i : i32, j : i32) -> i32 { return i + simParams.nx * j; }

fn ToIndex1D(p : vec2i) -> i32 { return p.x + simParams.nx * p.y; }

fn Height(p : vec2i) -> f32 { return inElevation[ToIndex1D(p)]; }

fn UpliftAt(i : i32, j : i32) -> f32 { return upliftBuffer[ToIndex1D(i, j)]; }

fn ArrayPoint(p : vec2i) -> vec2f { 
  return simParams.lowerVert + vec2f(p) * simParams.cellDiag;
}

fn Point3D(p : vec2i) -> vec3f {
  return vec3f(ArrayPoint(p), Height(p));
}

fn Read(p : vec2i) -> vec4f {
  if (p.x < 0 || p.x >= simParams.nx || p.y < 0 || p.y >= simParams.ny) return vec4f();

  var id = ToIndex1D(p);

  var ret = vec4f();
  ret.x = inElevation[id];       // Bedrock elevation
  ret.y = inStreamArea[id];      // Stream area
  ret.z = upliftBuffer[id];      // Uplift factor
  return ret;
}

fn Write(id : i32, data : vec4f) {
  outElevation[id] = data.x;
  outStreamArea[id] = data.y;
}

fn Slope(p : vec2i, q : vec2i) -> f32 {
  if (p.x < 0 || p.x >= simParams.nx || p.y < 0 || p.y >= simParams.ny) return 0.0;
  if (q.x < 0 || q.x >= simParams.nx || q.y < 0 || q.y >= simParams.ny) return 0.0;
  if (p == q) return 0.0;

  var index_p = ToIndex1D(p.x, p.y);
  var index_q = ToIndex1D(q.x, q.y);
  var d = length(ArrayPoint(q) - ArrayPoint(p));
  return (inElevation[index_q] - inElevation[index_p]) / d;
}

fn Stream(p : vec2i) -> f32 {
  if (p.x < 0 || p.x >= simParams.nx || p.y < 0 || p.y >= simParams.ny) return 0.0;
  
  var index_p = ToIndex1D(p.x, p.y);
  return inStreamArea[index_p];
}

/*
fn Laplacian(p : vec2i) -> f32 {
  var lapl = 0.0;
  var i = p.x;
  var j = p.y;

  var hf = inElevation;
  var cellDiag = simParams.cellDiag;
  if (i == 0)
      lapl += (hf[ToIndex1D(i, j)] - 2.0 * hf[ToIndex1D(i + 1, j)] + hf[ToIndex1D(i + 2, j)]) / (cellDiag.x * cellDiag.x);
  else if (i == nx - 1)
      lapl += (hf[ToIndex1D(i, j)] - 2.0 * hf[ToIndex1D(i - 1, j)] + hf[ToIndex1D(i - 2, j)]) / (cellDiag.x * cellDiag.x);
  else
      lapl += (hf[ToIndex1D(i + 1, j)] - 2.0 * hf[ToIndex1D(i, j)] + hf[ToIndex1D(i - 1, j)]) / (cellDiag.x * cellDiag.x);

  if (j == 0)
      lapl += (hf[ToIndex1D(i, j)] - 2.0 * hf[ToIndex1D(i, j + 1)] + hf[ToIndex1D(i, j + 2)]) / (cellDiag.y * cellDiag.y);
  else if (j == ny - 1)
      lapl += (hf[ToIndex1D(i, j)] - 2.0 * hf[ToIndex1D(i, j - 1)] + hf[ToIndex1D(i, j - 2)]) / (cellDiag.y * cellDiag.y);
  else
      lapl += (hf[ToIndex1D(i, j + 1)] - 2.0 * hf[ToIndex1D(i, j)] + hf[ToIndex1D(i, j - 1)]) / (cellDiag.y * cellDiag.y);

  return lapl;
}
*/

fn GetFlowSteepest(p : vec2i) -> vec2i {
  var d = vec2i();
  var maxSlope = 0.0;
  for (var i = 0; i < 8; i++) {
      var ss = Slope(p + neighbors[i], p);
      if (ss > maxSlope) {
          maxSlope = ss;
          d = neighbors[i];
      }
  }
  return d;
}

fn WaterSteepest(p : vec2i) -> f32 {
  var water = 0.0;
  for (var i = 0; i < 8; i++) {
      var q = p + neighbors[i];
      var fd = GetFlowSteepest(q);
      if (q + fd == p) {
          water += Stream(q);
      }
  }
  return water;
}


@compute @workgroup_size(8, 8, 1)
fn simulate(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
  let idX = i32(GlobalInvocationID.x);
  let idY = i32(GlobalInvocationID.y);
  if (idX < 0 || idY < 0) return;
  if (idX >= simParams.nx || idY >= simParams.ny) return;

  var id = ToIndex1D(idX, idY);
  var p = vec2i(idX, idY);
  var data = Read(p);

  // Border nodes are fixed to zero (elevation and drainage)
  if (p.x == 0 || p.x == simParams.nx - 1 ||
      p.y == 0 || p.y == simParams.ny - 1) {
      data.x = 0.0;
      data.y = 1.0 * length(simParams.cellDiag);
      Write(id, data);
      return;
  }

  // Flows accumulation at p
  var waterIncr = WaterSteepest(p);

  data.y = 1.0 * length(simParams.cellDiag);
  data.y += waterIncr;

  // Erosion at p (relative to steepest)
  var d = GetFlowSteepest(p);
  var receiver = Read(p + d);
  var pSlope = abs(Slope(p + d, p));

  var erosion = k * pow(data.y, p_sa) * pow(pSlope, p_sl);

  var newHeight = data.x;
  if (erosionMode == 0) {       // Stream power
    newHeight -= dt * (erosion);
  }
  // else if (erosionMode == 1) {  // Stream power + Hillslope erosion (Laplacian)
  //   newHeight -= dt * (erosion - k_h * Laplacian(p));
  // }
  // else if (erosionMode == 2) {  // Stream power + Hillslope erosion (Laplacian) + Debris flow
  //   newHeight -= dt * (erosion - k_h * Laplacian(p) - k_d * pSlope);
  // }

  newHeight = max(newHeight, receiver.x);
  newHeight += dt * uplift * data.z;

  data.x = newHeight;
  Write(id, data);
}
