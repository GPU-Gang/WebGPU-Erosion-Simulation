struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>,
  right: vec3<f32>,
  up: vec3<f32>,
  forward: vec3<f32>,
  eye: vec3<f32>,
  screenDims: vec2<f32>,
}

struct Terrain
{
    textureSize: vec2<i32>, // texture size
    lowerLeft: vec2<f32>,   // AABB
    upperRight: vec2<f32>,  // AABB
    cellDiag: vec2<f32>,    // cell diagonal
    heightRange: vec2<f32>  // height range
}

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var heightFieldSampler : sampler;
@group(0) @binding(2) var heightfield : texture_2d<f32>;
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
const FOVY : f32 = 45.0f * PI / 180.0;
const MAX_ITERS : i32 = 256;
const MIN_DIST : f32 = 0.01f;
const MAX_DIST : f32 = 1000000.0f;
const EPSILON : f32 = MIN_DIST;
const K: f32 = 1.0f;                              // hardcoded Lipschitz constant
const lightPos: vec3<f32> = vec3(5, 12, -5);       // light position

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
    t: f32,
    hitPoint: vec3<f32>,
}

/* =================================
 * ========= RAY FUNCTIONS =========
 * =================================
*/

fn rayCast(fs_UV: vec2<f32>) -> Ray
{
    var ndc : vec2<f32> = (fs_UV);
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

	var rinvDir : vec3<f32> = 1.0 / ray.direction;
	var delta : f32 = 0.1 * (terrain.heightRange.y - terrain.heightRange.x);
	var tbot : vec3<f32> = rinvDir * (vec3(terrain.lowerLeft.x, terrain.heightRange.x - delta, terrain.lowerLeft.y) - ray.origin);
	var ttop : vec3<f32> = rinvDir * (vec3(terrain.upperRight.x, terrain.heightRange.y + delta, terrain.upperRight.y) - ray.origin);

	var tmin : vec3<f32> = min(ttop, tbot);
	var tmax : vec3<f32> = max(ttop, tbot);
	var t : vec2<f32> = max(tmin.xx, tmin.yz);
	var t0 : f32 = max(t.x, t.y);
	t = min(tmax.xx, tmax.yz);
	var t1 : f32 = min(t.x, t.y);

    result.hit = t1 > max(t0, 0.0);
    result.tNear = t0;
    result.tFar = t1;

    return result;
}

/* ===============================
 * ======== SDF Primitives =======
 * ===============================
*/

fn sdfSphere(p: vec3<f32>) -> f32
{
    return distance(p, vec3(0,0,0)) - 0.257f;
}

fn sdfBox2D(p: vec2<f32>, lowerLeft: vec2<f32>, upperRight: vec2<f32>) -> f32
{
	var center: vec2<f32> = 0.5 * (lowerLeft + upperRight);
	var r: vec2<f32> = 0.5 * (upperRight - lowerLeft);
	var q: vec2<f32> = abs(p - center) - r;
    return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0);
}

fn sdfBox3D(p: vec3<f32>, lowerLeft: vec3<f32>, upperRight: vec3<f32>) -> f32
{
	var center: vec3<f32> = 0.5 * (lowerLeft + upperRight);
	var r: vec3<f32> = 0.5 * (upperRight - lowerLeft);
	var q: vec3<f32> = abs(p - center) - r;
	return length(max(q, vec3(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);
}

/* ==================================
 * ========= Operations =========
 * ==================================
*/

// Intersection from IQ
fn sdfIntersection(sdfA: f32, sdfB: f32) -> f32
{
	return max(sdfA, sdfB);
}

// Remap a value in one range to a different range
fn remap(val: f32, oldMin: f32, oldMax: f32, newMin: f32, newMax: f32) -> f32
{
	return newMin + (newMax - newMin) * ((val - oldMin) / (oldMax - oldMin));
}

/* ============================================
 * ======== Heightfield calculations ==========
 * ============================================
*/

// Read height from the heightfield texture given a world point
// returns height at point
fn getTerrainElevation(p: vec2<f32>) -> f32
{
    // calculate the uv value between 0 and 1
	var numerator: vec2<f32> = p - terrain.lowerLeft;       // lower left to current point
	var denom: vec2<f32> = terrain.upperRight - terrain.lowerLeft;  // full range
	var uv: vec2<f32> = numerator / denom;    // remap the vec2 point to a 0->1 range

    var heightCol : vec4<f32> = textureSample(heightfield, heightFieldSampler, uv);
    var height : f32 = heightCol.r; // black and white means same colour in all channels
    
    // this is between 0 and 1 --> remap to correct height range
	return remap(height, 0.0f, 1.0f, terrain.heightRange.x, terrain.heightRange.y);
}

/* ============================================
 * ============ Main Raymarching ==============
 * ============================================
*/

// Signed distance field object
// returns signed distance value for the terrain at the point p.
fn terrainSdf(p: vec3<f32>) -> f32 {
	var t : f32 = p.y - getTerrainElevation(p.xz);
	var delta : f32 = 0.1f * (terrain.heightRange.y - terrain.heightRange.x);
    
    var boxSdf: f32 = sdfBox3D(p, 
                                vec3(terrain.lowerLeft.x, terrain.heightRange.x - delta, terrain.lowerLeft.y),
                                vec3(terrain.upperRight.x, terrain.heightRange.y + delta, terrain.upperRight.y));

    return sdfIntersection(boxSdf, t);
}

fn raymarchTerrain(ray: Ray) -> RaymarchResult
{
    var result : RaymarchResult;
    result.hit = false;
    result.t = -1;

    var aabbTest = intersectAABB(ray);

    // TODO: find a way to re-enable this optimisation because WebGPU has over strict uniformity analysis
    // if (!aabbTest.hit)
    // {
    //     // didn't hit AABB
    //     // def not hitting terrain
    //     return result;
    // }

    var t : f32 = max(MIN_DIST, aabbTest.tNear);        // start at the point of intersection with the AABB, don't waste unnecessary marching steps
    var dist : f32 = 0;
    var p: vec3<f32>;
    
    // Lipschitz bound is dependent on ray direction
	var uz: f32 = abs(ray.direction.y);
	var kr: f32 = uz + K * sqrt(1.0f - (uz * uz));

    for (var i : i32 = 0; i<MAX_ITERS; i++)
    {
        // TODO: find a way to re-enable this optimisation because WebGPU has over strict uniformity analysis
        // if (t < aabbTest.tFar)
        // {
        //     // passed the AABB and didn't hit anything
        //     // stop raymarching
        //     break;
        // }

        p = ray.origin + ray.direction * t;

        dist = terrainSdf(p);

        if (dist < 0.0f && !result.hit)
        {
            result.hit = true;
            result.t = t;
            result.hitPoint = p;

            // break;   // stupid webgpu uniformity analysis issue. TODO: find a way to optimise here
        }

        if (dist >= MAX_DIST)
        {
            // break;   // stupid webgpu uniformity analysis issue. TODO: find a way to optimise here
        }

        t += max(dist / kr, MIN_DIST);
    }

    return result;
}

/* ============================================
 * ================= Shading ==================
 * ============================================
*/

fn computeNormal(p: vec3<f32>, eps: vec2<f32>) -> vec3<f32>
{
    var e: vec3<f32> = vec3(eps.x, 0.0, eps.y);
    return normalize(vec3(getTerrainElevation(p.xz + e.xy) - getTerrainElevation(p.xz - e.xy),
                            getTerrainElevation(p.xz + e.yz) - getTerrainElevation(p.xz - e.yz),
                            length(eps)
    ));
}

fn getTerrainColour(p: vec3<f32>) -> vec4<f32>
{
    // TODO: texture size should probably be higher when we get it from the CPU
    var n: vec3<f32> = computeNormal(p, vec2(EPSILON));//(terrain.upperRight - terrain.lowerLeft) / vec2<f32>(terrain.textureSize));

	// Terrain sides and bottom
	if (abs(sdfBox2D(p.xz, terrain.lowerLeft, terrain.upperRight)) < EPSILON
        || abs(p.y - terrain.heightRange.x + 0.1f * (terrain.heightRange.y - terrain.heightRange.x)) < EPSILON)
    {
        return vec4(0.3f, 0.29f, 0.31f, 1.0f);
    }
	
    var shadingMode: i32 = 0;       // hardcoded

	// Terrain interior
	if (shadingMode == 0)   // normals
	{
        // TODO: find a way to optimise this non-uniformity nonsense
		// var n: vec3<f32> = computeNormal(p, (terrain.upperRight - terrain.lowerLeft) / vec2<f32>(terrain.textureSize));
		return vec4(0.2 * (vec3(3.0) + 2.0 * n.xyz), 1.0);
	}
	else if (shadingMode == 1)  // lambertian
	{
		var lightDir: vec3<f32> = normalize(vec3(0,0,0) - lightPos); // terrain located at world 0,0,0
        var ambientTerm: f32 = 0.2;
        var lambertianTerm: vec3<f32> = vec3(max(dot(n, lightDir), 0.0f) + ambientTerm);
        
        var col: vec3<f32> = vec3(1,1,1);
		return vec4(lambertianTerm * col, 1.0f);
	}
	else
    {
		return vec4(1.0, 1.0, 1.0, 1.0);
    }
}

@fragment
fn frag_main(@location(0) fs_UV : vec2<f32>) -> @location(0) vec4<f32>
{
    var ray : Ray = rayCast(fs_UV);
    var raymarchResult : RaymarchResult = raymarchTerrain(ray);
    var outColor : vec4<f32> = vec4(0,0,0.2,1);

    var terrainColor: vec4<f32> = getTerrainColour(raymarchResult.hitPoint);

    if (raymarchResult.hit)
    {
        outColor = terrainColor;
        // TODO: find a way to optimise this WebGPU non-uniformity nonsense
        // outColor = getTerrainColour(raymarchResult.hitPoint);
    }

    // outColor = vec4((uniforms.right), 1);

    return outColor;
}