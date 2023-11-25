struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>,
  up: vec3<f32>,
  right: vec3<f32>,
  forward: vec3<f32>,
  eye: vec3<f32>,
  screenDims: vec2<f32>,
}

struct Terrain
{
    lowerLeft: vec2<f32>,   // AABB
    upperRight: vec2<f32>,  // AABB
}

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var mySampler : sampler;
@group(0) @binding(2) var myTexture : texture_2d<f32>;
@group(0) @binding(3) var<uniform> terrain : Terrain;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) fs_UV : vec2<f32>,
}

@vertex
fn vert_main(
  @location(0) vs_pos: vec4<f32>,
  @location(1) vs_nor: vec4<f32>,
  @location(2) vs_uv: vec2<f32>) -> VertexOutput {
  var output : VertexOutput;
  output.Position = uniforms.modelViewProjectionMatrix * vs_pos;
  output.fs_UV = vs_uv;
  return output;
}

// ----------- FRAG SHADER ------------ //

const PI : f32 = 3.14159265358979323;
const FOVY : f32 = 19.5f * PI / 180.0;
const MAX_ITERS : i32 = 256;
const MIN_DIST : f32 = 0.00001f;
const MAX_DIST : f32 = 1000000.0f;
const EPSILON : vec3<f32> = vec3(0, MIN_DIST, 0);

// Data structures
struct Ray {
    origin: vec3<f32>,
    direction: vec3<f32>,
};

struct IntersectAABBResult
{
    hit: bool,
    tNear: f32,
    tFar: f32
}

struct RaymarchResult
{
    hit: bool,
    t: f32
}

fn rayCast(fs_UV: vec2<f32>) -> Ray
{
    var ndc : vec2<f32> = (fs_UV / uniforms.screenDims);
    ndc = ndc * 2.f - vec2(1.f);

    let aspect : f32 = uniforms.screenDims.x / uniforms.screenDims.y;
    let reference : vec3<f32> = uniforms.eye + uniforms.forward;
    let V : vec3<f32> = uniforms.up * tan(FOVY * 0.5);
    let H : vec3<f32> = uniforms.right * tan(FOVY * 0.5) * aspect;
    let p : vec3<f32> = reference + H * ndc.x + V * ndc.y;

    return Ray(uniforms.eye, normalize(p - uniforms.eye));
}

fn intersectAABB(ray: Ray) -> IntersectAABBResult
{
    var result : IntersectAABBResult;
    result.hit = false;
    result.tNear = -1;
    result.tFar = -1;

    return result;
}

fn raymarchTerrain(ray: Ray) -> RaymarchResult
{
    var result : RaymarchResult;
    result.hit = false;
    result.t = -1;

    var aabbTest = intersectAABB(ray);
    if (!aabbTest.hit)
    {
        // didn't hit AABB
        // def not hitting terrain
        return result;
    }

    var t : f32 = MIN_DIST;
    for (var i : i32 = 0; i<MAX_ITERS; i++)
    {
        var p : vec3<f32> = ray.origin + ray.direction * t;
        var m : f32 = 1;

        if (m > MIN_DIST)
        {
            result.hit = true;
            result.t = t;
        }
    }

    return result;
}

@fragment
fn frag_main(@location(0) fs_UV : vec2<f32>) -> @location(0) vec4<f32>
{
    return vec4(1,0,0,1);
    var ray : Ray = rayCast(fs_UV);
    var raymarchResult : RaymarchResult =  raymarchTerrain(ray);
    var outColor : vec4<f32> = vec4(0,0,0,1);

    if (raymarchResult.hit)
    {
        outColor = vec4(1,0,0,1);
    }

    var col : vec4<f32> = textureSample(myTexture, mySampler, fs_UV);
    return outColor;
}