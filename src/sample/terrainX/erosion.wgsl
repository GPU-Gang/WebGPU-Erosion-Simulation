struct SimulationParams {
  nx         : i32,    // array dimension
  ny         : i32,
  lowerVertX : f32,  // lower and upper vertices of the box of the heightfield
  lowerVertY : f32,
  upperVertX : f32,
  upperVertY : f32,
  cellDiagX  : f32,  // cell diagonal
  cellDiagY  : f32,
}

// Uniforms
@group(0) @binding(0) var<uniform> simParams : SimulationParams;

@group(1) @binding(1) var inElevation : texture_2d<f32>;
@group(1) @binding(2) var outElevation : texture_storage_2d<rgba8unorm, write>;
@group(1) @binding(3) var inUplift : texture_2d<f32>;
@group(1) @binding(4) var inStream : texture_2d<f32>;
@group(1) @binding(5) var outStream : texture_storage_2d<rgba8unorm, write>;


// ----------- Global parameters -----------
// 0: Stream power
// TODO 1: Stream power + Hillslope (Laplacian)
// TODO 2: Stream power + Hillslope (Laplacian) + Debris slope
const erosionMode : i32 = 0;

const uplift : f32 = 0.005;
const k : f32 = 0.05;
const k_d : f32 = 10.0;
const k_h : f32 = 3.0;
const p_sa : f32 = 1.0;
const p_sl : f32 = 1.0;
const dt : f32 = 7.0;

// next 8 neighboring cells
const neighbors : array<vec2i, 8> = array<vec2i, 8>(
  vec2i(0, 1), vec2i(1, 1), 
  vec2i(1, 0), vec2i(1, -1), 
  vec2i(0, -1), vec2i(-1, -1), 
  vec2i(-1, 0), vec2i(-1, 1)
);

// ----------- Utilities -----------
fn ToIndex1D(i : i32, j : i32) -> i32 { return i + simParams.nx * j; }

fn ToIndex1DFromVec(p : vec2i) -> i32 { return p.x + simParams.nx * p.y; }

fn Height(p : vec2i) -> f32 {
    let color = textureLoad(inElevation, vec2u(p), 0);
    return color.r;
}

fn UpliftAt(p : vec2i) -> f32 {
    let color = textureLoad(inUplift, vec2u(p), 0);
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

fn Stream(p : vec2i) -> f32 {
  if (p.x < 0 || p.x >= simParams.nx || p.y < 0 || p.y >= simParams.ny) 
  {return 0.0;
  }
  
  // var index_p = ToIndex1D(p.x, p.y);
  return StreamAt(p);//inStreamArea[index_p];
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

fn WaterSteepest(p : vec2i) -> f32 {
  var water = 0.0;
  for (var i = 0; i < 8; i++) {
      var q = p + neighbors[i];
      var fd = GetFlowSteepest(q);
      if ((q + fd).x == p.x && (q + fd).y == p.y) {
          water += Stream(q);
      }
  }
  return water;
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


@compute @workgroup_size(64)
fn main(
  @builtin(workgroup_id) WorkGroupID : vec3<u32>,
  @builtin(local_invocation_id) LocalInvocationID : vec3<u32>,
  @builtin(global_invocation_id) GlobalInvocationID : vec3<u32>
) {
  let idX = i32(GlobalInvocationID.x);
  let idY = i32(GlobalInvocationID.y);
  if (idX < 0 || idY < 0) { return; }
  if (idX >= simParams.nx || idY >= simParams.ny) { return; }

  //var id : i32 = ToIndex1D(idX, idY);
  var p : vec2i = vec2i(idX, idY);
  var data : vec4f = Read(p);
  var cellDiag = vec2f(simParams.cellDiagX, simParams.cellDiagY);

  // Border nodes are fixed to zero (elevation and drainage)
  if (p.x == 0 || p.x == simParams.nx - 1 ||
      p.y == 0 || p.y == simParams.ny - 1) {
    data.x = 0.0;
    
    data.y = 1.0 * length(cellDiag);
    
    Write(p, data);
    return;
  }

  // Flows accumulation at p
  var waterIncr = WaterSteepest(p);

  data.y = 1.0 * length(cellDiag);
  data.y += waterIncr;

  // Erosion at p (relative to steepest)
  var d = GetFlowSteepest(p);
  var receiver = Read(p + d);
  var pSlope = abs(Slope(p + d, p));

  var erosion = k * pow(data.y, p_sa) * pow(pSlope, p_sl);

  var newHeight = data.x;
  if (erosionMode == 0) {          // Stream power
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
  Write(p, data);


/*let globalPosition : vec2<u32> = vec2<u32>(u32(GlobalInvocationID.x), u32(GlobalInvocationID.y));

// Get the size of the input texture
let texSize : vec2<u32> = textureDimensions(inElevation);

// Check if the current position is within the bounds of the texture
if all(globalPosition < texSize) {
  // Sample the input texture at the current position
  //GPT:
  //let color : vec4<f32> = textureSample(inputTexture, inputSampler, globalPosition);
  
  //From: https://www.reddit.com/r/wgpu/comments/x5z4tb/writing_to_a_texture_from_a_compute_shader/
  var color = textureLoad(inElevation, globalPosition, 0);

  // Write the sampled color to the output texture at the same position
  //GPT:
  //textureWrite(color, outputTexture, globalPosition);
  
  //From imageBlur sample and also the reddit link above
  textureStore(outElevation, globalPosition, color);
  }*/
}