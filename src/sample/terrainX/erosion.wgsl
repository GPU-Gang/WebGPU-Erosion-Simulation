struct SimulationParams {
  nx         : i32,     // array dimension
  ny         : i32,
  lowerVertX : f32,     // lower and upper vertices of the box of the heightfield
  lowerVertY : f32,
  upperVertX : f32,
  upperVertY : f32,
  cellDiagX  : f32,     // cell diagonal
  cellDiagY  : f32,
}

struct CustomBrushParams {
  brushPosX     : f32,
  brushPosY     : f32,
  brushScale    : f32,
  brushStrength : f32,
  width         : i32,  // brush texture size
  height        : i32,
  erase         : f32,  // temp boolean to erase terrain
  useCustomBrush: f32,  // boolean
  // TODO: rotation
}

struct AABB {
  lowerLeft   : vec2<f32>,
  upperRight  : vec2<f32>,
}

// Uniforms
@group(0) @binding(0) var<uniform> simParams : SimulationParams;

@group(1) @binding(1) var inElevation : texture_2d<f32>;
@group(1) @binding(2) var outElevation : texture_storage_2d<rgba8unorm, write>;
@group(1) @binding(3) var inUplift : texture_2d<f32>;
@group(1) @binding(4) var outUplift : texture_storage_2d<rgba8unorm, write>;
@group(1) @binding(5) var inStream : texture_2d<f32>;
@group(1) @binding(6) var outStream : texture_storage_2d<rgba8unorm, write>;
@group(1) @binding(7) var<storage, read_write> steepestFlowBuffer : array<vec2i>;

@group(2) @binding(0) var<uniform> customBrushParams : CustomBrushParams;
@group(2) @binding(1) var customBrush : texture_2d<f32>;
// @group(2) @binding(2) var brushSampler : sampler;

// ----------- Global parameters -----------
// 0: Stream power
// 1: Stream power + Hillslope (Laplacian)
// 2: Stream power + Hillslope (Laplacian) + Debris slope
const erosionMode : i32 = 2;

const uplift : f32 = 0.005;//0.01;
const k : f32 = 0.05;//0.0005;
const k_d : f32 = 10.0;
const k_h : f32 = 3.0;//2.0;
const p_sa : f32 = 1.0;//0.8;
const p_sl : f32 = 1.0;//2.0;
const dt : f32 = 2.0;//1.0;

// next 8 neighboring cells
const neighbors : array<vec2i, 8> = array<vec2i, 8>(
  vec2i(0, 1), vec2i(1, 1), 
  vec2i(1, 0), vec2i(1, -1), 
  vec2i(0, -1), vec2i(-1, -1), 
  vec2i(-1, 0), vec2i(-1, 1)
);

// ----------- Utilities -----------
fn ToIndex1D(i : i32, j : i32) -> i32 { return i + simParams.nx * j; }

fn ToIndex1DFromCoord(p : vec2i) -> i32 { return p.x + simParams.nx * p.y; }

fn Height(p : vec2i) -> f32 {
    let color = textureLoad(inElevation, vec2u(p), 0);
    return color.r;
}

fn UpliftAt(p : vec2i) -> f32 {
    var color = textureLoad(inUplift, vec2u(p), 0);

    var pf = vec2f(p);
    if (customBrushParams.brushPosX != -1 && customBrushParams.brushPosY != -1) {
      if (customBrushParams.useCustomBrush == 1) {
        color.r = DrawBrush(pf, color.r);
      }
      else {
        color.r = DrawPaint(pf, color.r);
      }
    }

    textureStore(outUplift, p, vec4f(vec3f(color.r), 1.f));
    return color.r; // also greyscale?
}

fn StreamAt(p : vec2i) -> f32 {
    let color = textureLoad(inStream, vec2u(p), 0);
    return color.r; // also greyscale?
}

fn ArrayPoint(p : vec2i) -> vec2f {
  let lowerVert = vec2f(simParams.lowerVertX, simParams.lowerVertY);
  let cellDiag = vec2f(simParams.cellDiagX, simParams.cellDiagY);
  return lowerVert + vec2f(p) * cellDiag;
}

fn Point3D(p : vec2i) -> vec3f {
  return vec3f(ArrayPoint(p), Height(p));
}

fn Slope(p : vec2i, q : vec2i) -> f32 {
  if (p.x < 0 || p.x >= simParams.nx || p.y < 0 || p.y >= simParams.ny) { return 0.0; }
  if (q.x < 0 || q.x >= simParams.nx || q.y < 0 || q.y >= simParams.ny) { return 0.0; }
  if (p.x == q.x && p.y == q.y) { return 0.0; }

  var d = length(ArrayPoint(q) - ArrayPoint(p));
  return (Height(q) - Height(p)) / d;
}

fn SetFlowSteepest(i: i32, data: vec2i)
{
  var dataXIdx = i * 2 + 0;
  var dataYIdx = i * 2 + 1;
  steepestFlowBuffer[i] = data;
}

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

fn GetFlowSteepestFast(i : i32) -> vec2i {
  return steepestFlowBuffer[i];
}

fn Stream(p : vec2i) -> f32 {
  if (p.x < 0 || p.x >= simParams.nx || p.y < 0 || p.y >= simParams.ny) { return 0.0; }
  
  return StreamAt(p);
}

fn WaterSteepest(p : vec2i) -> f32 {
  var water = 0.0;
  for (var i = 0; i < 8; i++) {
      var q = p + neighbors[i];
      var fd = GetFlowSteepestFast(ToIndex1DFromCoord(q));
      if ((q + fd).x == p.x && (q + fd).y == p.y) {
        water += Stream(q);
      }
  }
  return water;
}

fn Laplacian(p : vec2i) -> f32 {
  var laplacian = 0.0;
  var i : i32 = p.x;
  var j : i32 = p.y;

  var sqrCellDiagX = simParams.cellDiagX * simParams.cellDiagX;
  var sqrCellDiagY = simParams.cellDiagY * simParams.cellDiagY;

  if (i == 0) {
    laplacian += (Height(p) - 2.0 * Height(vec2i(i+1, j)) + Height(vec2i(i+2, j))) / sqrCellDiagX;
  }
  else if (i == simParams.nx - 1) {
    laplacian += (Height(p) - 2.0 * Height(vec2i(i-1, j)) + Height(vec2i(i-2, j))) / sqrCellDiagX;
  }
  else {
    laplacian += (Height(vec2i(i+1, j)) - 2.0 * Height(vec2i(i, j)) + Height(vec2i(i-1, j))) / sqrCellDiagX;
  }
  
  if (j == 0) {
    laplacian += (Height(p) - 2.0 * Height(vec2i(i, j+1)) + Height(vec2i(i, j+2))) / sqrCellDiagY;
  }
  else if (j == simParams.ny - 1) {
    laplacian += (Height(p) - 2.0 * Height(vec2i(i, j-1)) + Height(vec2i(i, j-2))) / sqrCellDiagY;
  }
  else {
    laplacian += (Height(vec2i(i, j+1)) - 2.0 * Height(vec2i(i, j)) + Height(vec2i(i, j-1))) / sqrCellDiagY;
  }

  return laplacian;
}

fn Read(p : vec2i) -> vec4f {
  if (p.x < 0 || p.x >= simParams.nx || p.y < 0 || p.y >= simParams.ny) {
    return vec4f();
  }

  var ret = vec4f();
  ret.x = Height(p);        // Bedrock elevation
  ret.y = StreamAt(p);      // Stream area
  ret.z = UpliftAt(p);      // Uplift factor
  return ret;
}

fn Write(p : vec2i, data : vec4f) {
  textureStore(outElevation, p, vec4f(data.x));
  textureStore(outStream, p, vec4f(data.y));
}

// Local Editing
fn DrawPaint(pf : vec2f, colorChannel : f32) -> f32 {
  var PAINT_STRENGTH = customBrushParams.brushStrength;
  var PAINT_RADIUS = customBrushParams.brushScale * 2.0; // scale up for now as brush texture is using this as mip level

  var dist = distance(vec2f(customBrushParams.brushPosX, customBrushParams.brushPosY), pf);
  if (dist <= PAINT_RADIUS) {
    var factor = 1.0 - dist * dist / (PAINT_RADIUS * PAINT_RADIUS);
    if (customBrushParams.erase == 1) {
      return colorChannel - PAINT_STRENGTH * factor * factor * factor;
    }
    else {
      return colorChannel + PAINT_STRENGTH * factor * factor * factor;
    }
  }

  return colorChannel;
}

fn GetBrushAABB() -> AABB {
  var center = vec2f(customBrushParams.brushPosX, customBrushParams.brushPosY);
  var halfWidth = f32(textureDimensions(customBrush).x / 2);
  var halfHeight = f32(textureDimensions(customBrush).y / 2);
  var scale = 1 + customBrushParams.brushScale;

  var lowerLeft = vec2f(center.x - halfWidth / scale, center.y - halfHeight / scale);
  var upperRight = vec2f(center.x + halfWidth / scale, center.y + halfHeight / scale);
  return AABB(lowerLeft, upperRight);
}

fn DrawBrush(pf : vec2f, colorChannel : f32) -> f32 {
  var bb = GetBrushAABB();
  var minX = bb.lowerLeft.x;
  var minY = bb.lowerLeft.y;
  var maxX = bb.upperRight.x;
  var maxY = bb.upperRight.y;
  var withinBB = minX < pf.x && pf.x < maxX &&
                  minY < pf.y && pf.y < maxY;
  if (withinBB) {
    // var texCoordf = vec2f((pf.x - minX) / f32(textureDimensions(customBrush).x),
    //                       (pf.y - minY) / f32(textureDimensions(customBrush).y));
    var pixelIdx = vec2u(u32(pf.x - minX), u32(pf.y - minY));

    var strength = customBrushParams.brushStrength * 0.1; // scale down strength for now, testing
    if (customBrushParams.erase == 1) {
      // use brushScale as mip level; use b channel from sampled value
      return colorChannel - textureLoad(customBrush, pixelIdx, u32(customBrushParams.brushScale)).b * strength;
      // color.g -= textureSampleLevel(customBrush, brushSampler, texCoordf, customBrushParams.brushScale).b / customBrushParams.brushStrength;
    }
    else {
      return colorChannel + textureLoad(customBrush, pixelIdx, u32(customBrushParams.brushScale)).b * strength;
      // color.g += textureSampleLevel(customBrush, brushSampler, texCoordf, customBrushParams.brushScale).b / customBrushParams.brushStrength;
    }
  }

  return colorChannel;      
}

@compute @workgroup_size(8, 8, 1)
fn main(
  @builtin(workgroup_id) WorkGroupID : vec3<u32>,
  @builtin(local_invocation_id) LocalInvocationID : vec3<u32>,
  @builtin(global_invocation_id) GlobalInvocationID : vec3<u32>
) {
  let idX = i32(GlobalInvocationID.x);
  let idY = i32(GlobalInvocationID.y);
  // if (idX < 0 || idY < 0) { return; }
  // if (idX >= simParams.nx || idY >= simParams.ny) { return; }

  var id : i32 = ToIndex1D(idX, idY);
  var p : vec2i = vec2i(idX, idY);
  var data : vec4f = Read(p);
  var cellDiag = vec2f(simParams.cellDiagX, simParams.cellDiagY);

  var newHeight = 0.0;
  var borderNode: bool = false;
  var d: vec2i;
  // Border nodes are fixed to zero (elevation and drainage)
  if (p.x == 0 || p.x == simParams.nx - 1 ||
      p.y == 0 || p.y == simParams.ny - 1)
  {
    data.x = 0.0;
    data.y = 1.0 * length(cellDiag);
    Write(p, data);
    borderNode = true;
  }
  else
  {
    // Erosion at p (relative to steepest)
    d = GetFlowSteepest(p);
    SetFlowSteepest(id, d);
  }

  workgroupBarrier(); // workgroup barrier must happen in uniform control flow

  if (borderNode)
  {
    return;
  }

  // Flows accumulation at p
  var waterIncr = WaterSteepest(p);

  data.y = 1.0 * length(cellDiag);
  data.y += waterIncr;

  var receiver = Read(p + d);
  var pSlope = abs(Slope(p + d, p));

  var erosion = k * pow(data.y, p_sa) * pow(pSlope, p_sl);

  newHeight = data.x;
  if (erosionMode == 0) {           // Stream power
    newHeight -= dt * (erosion);
  }
  else if (erosionMode == 1) {      // Stream power + Hillslope erosion (Laplacian)
    newHeight -= dt * (erosion - k_h * Laplacian(p));
  }
  else if (erosionMode == 2) {      // Stream power + Hillslope erosion (Laplacian) + Debris flow
    newHeight -= dt * (erosion - k_h * Laplacian(p) - k_d * pSlope);
  }

  newHeight = max(newHeight, receiver.x);
  newHeight += dt * uplift * data.z;

  data.x = newHeight;
  Write(p, data);
}