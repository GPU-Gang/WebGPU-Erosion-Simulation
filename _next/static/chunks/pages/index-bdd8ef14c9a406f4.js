(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[405],{8312:function(e,n,t){(window.__NEXT_P=window.__NEXT_P||[]).push(["/",function(){return t(9822)}])},9822:function(e,n,t){"use strict";let r,i;t.r(n),t.d(n,{default:function(){return pages}});var a=t(6416),o=t(5893),s=t(9008),u=t.n(s),c=t(7294),f=t(4131),l=t.n(f);let SampleLayout=e=>{let n=(0,c.useRef)(null),r=(0,c.useRef)(null),i=(0,c.useMemo)(()=>{if(e.gui){let e=t(4376);return new e.GUI({autoPlace:!1})}},[]),a=(0,c.useRef)(null),s=(0,c.useMemo)(()=>{if(e.stats){let e=t(2792);return new e}},[]),[f,p]=(0,c.useState)(null);return(0,c.useEffect)(()=>{if(i&&r.current)for(r.current.appendChild(i.domElement);i.__controllers.length>0;)i.__controllers[0].remove();s&&a.current&&(s.dom.style.position="absolute",s.showPanel(1),a.current.appendChild(s.dom));let t={active:!0};try{let r=n.current;if(!r)throw Error("The canvas is not available");let a=e.init({canvas:r,pageState:t,gui:i,stats:s});a instanceof Promise&&a.catch(e=>{console.error(e),p(e)})}catch(e){console.error(e),p(e)}return()=>{t.active=!1}},[]),(0,o.jsxs)("main",{children:[(0,o.jsxs)(u(),{children:[(0,o.jsx)("title",{children:"Terrain X"}),(0,o.jsx)("meta",{name:"description",content:e.description}),(0,o.jsx)("meta",{httpEquiv:"origin-trial",content:e.originTrial})]}),(0,o.jsxs)("div",{children:[(0,o.jsx)("h1",{children:e.name}),(0,o.jsx)("a",{target:"_blank",rel:"noreferrer",href:"https://github.com/".concat("GPU-Gang/WebGPU-Erosion-Simulation","/tree/main/").concat(e.filename),children:"See it on Github!"}),(0,o.jsx)("p",{children:e.description}),f?(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)("p",{children:"Something went wrong. Do your browser and device support WebGPU?"}),(0,o.jsx)("p",{children:"".concat(f)})]}):null]}),(0,o.jsxs)("div",{className:l().canvasContainer,children:[(0,o.jsx)("div",{style:{position:"absolute",left:10},ref:a}),(0,o.jsx)("div",{style:{position:"absolute",right:10},ref:r}),(0,o.jsx)("canvas",{ref:n})]})]})},makeSample=e=>(0,o.jsx)(SampleLayout,{...e});var p=t(4478),d=class{setResolution(e){this.resolution=e,this.aspectRatio=e[0]/e[1]}updateProjectionMatrix(){a._E.perspective(this.fovy,this.aspectRatio,this.near,this.far,this.projectionMatrix)}update(){this.controls.tick();let e=this.viewMatrix();this.right[0]=-e[0],this.right[1]=-e[4],this.right[2]=-e[8],this.up[0]=e[1],this.up[1]=e[5],this.up[2]=e[9],this.forward[0]=-e[2],this.forward[1]=-e[6],this.forward[2]=-e[10]}viewMatrix(){return this.controls.matrix}getPosition(){return this.controls.eye}constructor(e,n){this.projectionMatrix=a._E.create(),this.fovy=45,this.aspectRatio=1,this.near=.1,this.far=1e6,this.resolution=a.K4.create(400,400),this.right=a.R3.create(1,0,0),this.up=a.R3.create(0,1,0),this.forward=a.R3.create(0,0,1),this.controls=p(document.getElementById("canvas"),{eye:e,center:n,translateSpeed:-1,mode:"orbit"}),this.controls.flipX=!0,this.controls.flipY=!0,this.controls.rotate(0,3.14159,0)}},h=class{create(e){this.device=e}createIndexBuffer(){return this.idxBound||(this.idxBound=!0,this.indexBuffer=this.device.createBuffer({size:this.indices.byteLength,usage:GPUBufferUsage.INDEX,mappedAtCreation:!0}),new Uint32Array(this.indexBuffer.getMappedRange()).set(this.indices),this.indexBuffer.unmap()),this.indexBuffer}createPosBuffer(){return this.posBound||(this.posBound=!0,this.posBuffer=this.device.createBuffer({size:this.positions.byteLength,usage:GPUBufferUsage.VERTEX,mappedAtCreation:!0}),new Float32Array(this.posBuffer.getMappedRange()).set(this.positions),this.posBuffer.unmap()),this.posBuffer}createNormalBuffer(){return this.norBound||(this.norBound=!0,this.normalBuffer=this.device.createBuffer({size:this.normals.byteLength,usage:GPUBufferUsage.VERTEX,mappedAtCreation:!0}),new Float32Array(this.normalBuffer.getMappedRange()).set(this.normals),this.normalBuffer.unmap()),this.normalBuffer}createUVBuffer(){return this.uvBound||(this.uvBound=!0,this.uvBuffer=this.device.createBuffer({size:this.uvs.byteLength,usage:GPUBufferUsage.VERTEX,mappedAtCreation:!0}),new Float32Array(this.uvBuffer.getMappedRange()).set(this.uvs),this.uvBuffer.unmap()),this.uvBuffer}elemCount(){return this.count}constructor(){this.count=0,this.idxBound=!1,this.posBound=!1,this.norBound=!1,this.uvBound=!1}};function degToRad(e){return .0174533*e}var v=class extends h{create(e){super.create(e),this.indices=new Uint32Array([0,1,2,0,2,3]),this.normals=new Float32Array([0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0]),this.positions=new Float32Array([-1,-1,0,1,1,-1,0,1,1,1,0,1,-1,1,0,1]),this.uvs=new Float32Array([0,1,1,1,1,0,0,0]),this.count=this.indices.length,this.createIndexBuffer(),this.createPosBuffer(),this.createNormalBuffer(),this.createUVBuffer(),console.log("Created quad")}createBindGroup(e,n,t,r,i){return this.bindGroupCreated||(this.bindGroupCreated=!0,this.bindGroup=this.device.createBindGroup({layout:e.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:n,offset:t}},{binding:1,resource:r},{binding:2,resource:i.createView()}]})),this.bindGroup}getModelMatrix(){let e=a._E.identity();return a._E.rotateX(e,this.rotation[0],e),a._E.rotateY(e,this.rotation[1],e),a._E.rotateZ(e,this.rotation[2],e),a._E.scale(e,this.scale,e),a._E.translate(e,this.center,e),e}constructor(e=a.vh.create(0,0,0,0),n=a.R3.create(1,1,1),t=a.R3.create(0,0,0)){super(),this.bindGroupCreated=!1,this.center=a.vh.fromValues(e[0],e[1],e[2],1),this.scale=n,this.rotation=t,this.rotation[0]=degToRad(this.rotation[0]),this.rotation[1]=degToRad(this.rotation[1]),this.rotation[2]=degToRad(this.rotation[2])}},g=class extends v{createTerrainBindGroup(e,n,t,r,i,a){return this.bindGroupCreated||(this.bindGroupCreated=!0,this.bindGroup=this.device.createBindGroup({layout:e.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:n,offset:t}},{binding:1,resource:r},{binding:2,resource:i.createView()},{binding:3,resource:{buffer:a,offset:0}}]})),this.bindGroup}},m=class{constructor(){this.nx=256,this.ny=256,this.lowerVertX=-5,this.lowerVertY=-5,this.upperVertX=5,this.upperVertY=5,this.cellDiagX=1176.47,this.cellDiagY=1176.47}};let x=0;function createRenderPipeline(e,n,t){let r=e.createRenderPipeline({layout:"auto",vertex:{module:e.createShaderModule({code:n}),entryPoint:"vert_main",buffers:[{arrayStride:16,attributes:[{shaderLocation:0,format:"float32x4",offset:0}]},{arrayStride:16,attributes:[{shaderLocation:1,format:"float32x4",offset:0}]},{arrayStride:8,attributes:[{shaderLocation:2,format:"float32x2",offset:0}]}]},fragment:{module:e.createShaderModule({code:n}),entryPoint:"frag_main",targets:[{format:t}]},primitive:{topology:"triangle-list",cullMode:"back"}});return r}function writeMVPUniformBuffer(e,n,t,r,i){let o=arguments.length>5&&void 0!==arguments[5]&&arguments[5],s=a._E.identity();var u=i.viewMatrix();o?a._E.multiply(s,r,s):(a._E.multiply(u,r,s),a._E.multiply(i.projectionMatrix,s,s)),e.queue.writeBuffer(n,t,new Float32Array([s[0],s[1],s[2],s[3],s[4],s[5],s[6],s[7],s[8],s[9],s[10],s[11],s[12],s[13],s[14],s[15],i.right[0],i.right[1],i.right[2],0,i.up[0],i.up[1],i.up[2],0,i.forward[0],i.forward[1],i.forward[2],0,i.getPosition()[0],i.getPosition()[1],i.getPosition()[2],0,i.resolution[0],i.resolution[1],0,0]))}let init=async e=>{let{canvas:n,pageState:t,gui:o}=e,s=await navigator.gpu.requestAdapter(),u=await s.requestDevice();if(!t.active)return;let c=n.getContext("webgpu"),f=window.devicePixelRatio;n.width=n.clientWidth*f,n.height=n.clientHeight*f;let l=navigator.gpu.getPreferredCanvasFormat();c.configure({device:u,format:l,alphaMode:"premultiplied"}),(r=new v(a.vh.create(2.5,2.5,0,0),a.R3.create(.3,.3,1))).create(u),(i=new g(a.vh.create(0,0,0,0),a.R3.create(1,1,1))).create(u);let p=a.R3.create(i.center[0],i.center[1]+2,i.center[2]),h=new d(a.R3.create(0,0,-10),p);h.setResolution(a.K4.create(n.width,n.height)),h.updateProjectionMatrix();let y=createRenderPipeline(u,"struct Uniforms {\n  modelViewProjectionMatrix : mat4x4<f32>,\n}\n@group(0) @binding(0) var<uniform> uniforms : Uniforms;\n\n@group(0) @binding(1) var mySampler : sampler;\n@group(0) @binding(2) var myTexture : texture_2d<f32>;\n\nstruct VertexOutput {\n  @builtin(position) Position : vec4<f32>,\n  @location(0) fs_UV : vec2<f32>,\n}\n\n@vertex\nfn vert_main(\n  @location(0) vs_pos: vec4<f32>,\n  @location(1) vs_nor: vec4<f32>,\n  @location(2) vs_uv: vec2<f32>) -> VertexOutput {\n  var output : VertexOutput;\n  output.Position = uniforms.modelViewProjectionMatrix * vs_pos;\n  output.fs_UV = vs_uv;\n  return output;\n}\n\n@fragment\nfn frag_main(@location(0) fs_UV : vec2<f32>) -> @location(0) vec4<f32> {\n  return textureSample(myTexture, mySampler, fs_UV);\n}",l),w=createRenderPipeline(u,"struct Uniforms {\n  modelViewProjectionMatrix : mat4x4<f32>,\n  right: vec3<f32>,\n  up: vec3<f32>,\n  forward: vec3<f32>,\n  eye: vec3<f32>,\n  screenDims: vec2<f32>,\n}\n\nstruct Terrain\n{\n    textureSize: vec2<i32>, // texture size\n    lowerLeft: vec2<f32>,   // AABB\n    upperRight: vec2<f32>,  // AABB\n}\n\n@group(0) @binding(0) var<uniform> uniforms : Uniforms;\n@group(0) @binding(1) var heightFieldSampler : sampler;\n@group(0) @binding(2) var heightfield : texture_2d<f32>;\n@group(0) @binding(3) var<uniform> terrain : Terrain;\n\nstruct VertexOutput {\n  @builtin(position) Position : vec4<f32>,\n  @location(0) fs_UV : vec2<f32>,\n}\n\n@vertex\nfn vert_main(\n  @location(0) vs_pos: vec4<f32>,\n  @location(1) vs_nor: vec4<f32>,\n  @location(2) vs_uv: vec2<f32>) -> VertexOutput {\n  var output : VertexOutput;\n  output.Position = uniforms.modelViewProjectionMatrix * vs_pos;\n  output.fs_UV = vs_uv;\n  return output;\n}\n\n// ----------- FRAG SHADER ------------ //\n\nconst PI : f32 = 3.14159265358979323;\nconst FOVY : f32 = 45.0f * PI / 180.0;\nconst MAX_ITERS : i32 = 256;\nconst MIN_DIST : f32 = 0.01f;\nconst MAX_DIST : f32 = 1000000.0f;\nconst EPSILON : f32 = MIN_DIST;\nconst heightRange : vec2<f32> = vec2(0, 1);       // hardcoded range for now\nconst K: f32 = 1.0f;                              // hardcoded Lipschitz constant\nconst lightPos: vec3<f32> = vec3(5, 12, -5);       // light position\n\n// Data structures\nstruct Ray {\n    origin: vec3<f32>,\n    direction: vec3<f32>,\n};\n\nstruct IntersectAABBResult\n{\n    hit: bool,\n    tNear: f32,\n    tFar: f32\n}\n\nstruct RaymarchResult\n{\n    hit: bool,\n    t: f32,\n    hitPoint: vec3<f32>,\n}\n\n/* =================================\n * ========= RAY FUNCTIONS =========\n * =================================\n*/\n\nfn rayCast(fs_UV: vec2<f32>) -> Ray\n{\n    var ndc : vec2<f32> = (fs_UV);\n    ndc = ndc * 2.f - vec2(1.f);\n\n    let aspect : f32 = uniforms.screenDims.x / uniforms.screenDims.y;\n    let reference : vec3<f32> = uniforms.eye + uniforms.forward;\n    let V : vec3<f32> = uniforms.up * tan(FOVY * 0.5);\n    let H : vec3<f32> = uniforms.right * tan(FOVY * 0.5) * aspect;\n    let p : vec3<f32> = reference + H * ndc.x + V * ndc.y;\n\n    return Ray(uniforms.eye, normalize(p - uniforms.eye));\n}\n\nfn intersectAABB(ray: Ray) -> IntersectAABBResult\n{\n    var result : IntersectAABBResult;\n    result.hit = false;\n    result.tNear = -1;\n    result.tFar = -1;\n\n	var rinvDir : vec3<f32> = 1.0 / ray.direction;\n	var delta : f32 = 0.1 * (heightRange.y - heightRange.x);\n	var tbot : vec3<f32> = rinvDir * (vec3(terrain.lowerLeft.x, heightRange.x - delta, terrain.lowerLeft.y) - ray.origin);\n	var ttop : vec3<f32> = rinvDir * (vec3(terrain.upperRight.x, heightRange.y + delta, terrain.upperRight.y) - ray.origin);\n\n	var tmin : vec3<f32> = min(ttop, tbot);\n	var tmax : vec3<f32> = max(ttop, tbot);\n	var t : vec2<f32> = max(tmin.xx, tmin.yz);\n	var t0 : f32 = max(t.x, t.y);\n	t = min(tmax.xx, tmax.yz);\n	var t1 : f32 = min(t.x, t.y);\n\n    result.hit = t1 > max(t0, 0.0);\n    result.tNear = t0;\n    result.tFar = t1;\n\n    return result;\n}\n\n/* ===============================\n * ======== SDF Primitives =======\n * ===============================\n*/\n\nfn sdfSphere(p: vec3<f32>) -> f32\n{\n    return distance(p, vec3(0,0,0)) - 0.257f;\n}\n\nfn sdfBox2D(p: vec2<f32>, lowerLeft: vec2<f32>, upperRight: vec2<f32>) -> f32\n{\n	var center: vec2<f32> = 0.5 * (lowerLeft + upperRight);\n	var r: vec2<f32> = 0.5 * (upperRight - lowerLeft);\n	var q: vec2<f32> = abs(p - center) - r;\n    return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0);\n}\n\nfn sdfBox3D(p: vec3<f32>, lowerLeft: vec3<f32>, upperRight: vec3<f32>) -> f32\n{\n	var center: vec3<f32> = 0.5 * (lowerLeft + upperRight);\n	var r: vec3<f32> = 0.5 * (upperRight - lowerLeft);\n	var q: vec3<f32> = abs(p - center) - r;\n	return length(max(q, vec3(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);\n}\n\n/* ==================================\n * ========= Operations =========\n * ==================================\n*/\n\n// Intersection from IQ\nfn sdfIntersection(sdfA: f32, sdfB: f32) -> f32\n{\n	return max(sdfA, sdfB);\n}\n\n// Remap a value in one range to a different range\nfn remap(val: f32, oldMin: f32, oldMax: f32, newMin: f32, newMax: f32) -> f32\n{\n	return newMin + (newMax - newMin) * ((val - oldMin) / (oldMax - oldMin));\n}\n\n/* ============================================\n * ======== Heightfield calculations ==========\n * ============================================\n*/\n\n// Read height from the heightfield texture given a world point\n// returns height at point\nfn getTerrainElevation(p: vec2<f32>) -> f32\n{\n    // calculate the uv value between 0 and 1\n	var numerator: vec2<f32> = p - terrain.lowerLeft;       // lower left to current point\n	var denom: vec2<f32> = terrain.upperRight - terrain.lowerLeft;  // full range\n	var uv: vec2<f32> = numerator / denom;    // remap the vec2 point to a 0->1 range\n\n    var heightCol : vec4<f32> = textureSample(heightfield, heightFieldSampler, uv);\n    var height : f32 = heightCol.r; // black and white means same colour in all channels\n    \n    // this is between 0 and 1 --> remap to correct height range\n	return remap(height, 0.0f, 1.0f, heightRange.x, heightRange.y);\n}\n\n/* ============================================\n * ============ Main Raymarching ==============\n * ============================================\n*/\n\n// Signed distance field object\n// returns signed distance value for the terrain at the point p.\nfn terrainSdf(p: vec3<f32>) -> f32 {\n	var t : f32 = p.y - getTerrainElevation(p.xz);\n	var delta : f32 = 0.1f * (heightRange.y - heightRange.x);\n    \n    var boxSdf: f32 = sdfBox3D(p, \n                                vec3(terrain.lowerLeft.x, heightRange.x - delta, terrain.lowerLeft.y),\n                                vec3(terrain.upperRight.x, heightRange.y + delta, terrain.upperRight.y));\n\n    return sdfIntersection(boxSdf, t);\n}\n\nfn raymarchTerrain(ray: Ray) -> RaymarchResult\n{\n    var result : RaymarchResult;\n    result.hit = false;\n    result.t = -1;\n\n    var aabbTest = intersectAABB(ray);\n\n    // TODO: find a way to re-enable this optimisation because WebGPU has over strict uniformity analysis\n    // if (!aabbTest.hit)\n    // {\n    //     // didn't hit AABB\n    //     // def not hitting terrain\n    //     return result;\n    // }\n\n    var t : f32 = max(MIN_DIST, aabbTest.tNear);        // start at the point of intersection with the AABB, don't waste unnecessary marching steps\n    var dist : f32 = 0;\n    var p: vec3<f32>;\n    \n    // Lipschitz bound is dependent on ray direction\n	var uz: f32 = abs(ray.direction.y);\n	var kr: f32 = uz + K * sqrt(1.0f - (uz * uz));\n\n    for (var i : i32 = 0; i<MAX_ITERS; i++)\n    {\n        // TODO: find a way to re-enable this optimisation because WebGPU has over strict uniformity analysis\n        // if (t < aabbTest.tFar)\n        // {\n        //     // passed the AABB and didn't hit anything\n        //     // stop raymarching\n        //     break;\n        // }\n\n        p = ray.origin + ray.direction * t;\n\n        dist = terrainSdf(p);\n\n        if (dist < 0.0f && !result.hit)\n        {\n            result.hit = true;\n            result.t = t;\n            result.hitPoint = p;\n\n            // break;   // stupid webgpu uniformity analysis issue. TODO: find a way to optimise here\n        }\n\n        if (dist >= MAX_DIST)\n        {\n            // break;   // stupid webgpu uniformity analysis issue. TODO: find a way to optimise here\n        }\n\n        t += max(dist / kr, MIN_DIST);\n    }\n\n    return result;\n}\n\n/* ============================================\n * ================= Shading ==================\n * ============================================\n*/\n\nfn computeNormal(p: vec3<f32>, eps: vec2<f32>) -> vec3<f32>\n{\n    var e: vec3<f32> = vec3(eps.x, 0.0, eps.y);\n    return normalize(vec3(getTerrainElevation(p.xz + e.xy) - getTerrainElevation(p.xz - e.xy),\n                            getTerrainElevation(p.xz + e.yz) - getTerrainElevation(p.xz - e.yz),\n                            length(eps)\n    ));\n}\n\nfn getTerrainColour(p: vec3<f32>) -> vec4<f32>\n{\n    // TODO: texture size should probably be higher when we get it from the CPU\n    var n: vec3<f32> = computeNormal(p, vec2(EPSILON));//(terrain.upperRight - terrain.lowerLeft) / vec2<f32>(terrain.textureSize));\n\n	// Terrain sides and bottom\n	if (abs(sdfBox2D(p.xz, terrain.lowerLeft, terrain.upperRight)) < EPSILON\n        || abs(p.y - heightRange.x + 0.1f * (heightRange.y - heightRange.x)) < EPSILON)\n    {\n        return vec4(0.3f, 0.29f, 0.31f, 1.0f);\n    }\n	\n    var shadingMode: i32 = 0;       // hardcoded\n\n	// Terrain interior\n	if (shadingMode == 0)   // normals\n	{\n        // TODO: find a way to optimise this non-uniformity nonsense\n		// var n: vec3<f32> = computeNormal(p, (terrain.upperRight - terrain.lowerLeft) / vec2<f32>(terrain.textureSize));\n		return vec4(0.2 * (vec3(3.0) + 2.0 * n.xyz), 1.0);\n	}\n	else if (shadingMode == 1)  // lambertian\n	{\n		var lightDir: vec3<f32> = normalize(vec3(0,0,0) - lightPos); // terrain located at world 0,0,0\n        var ambientTerm: f32 = 0.2;\n        var lambertianTerm: vec3<f32> = vec3(max(dot(n, lightDir), 0.0f) + ambientTerm);\n        \n        var col: vec3<f32> = vec3(1,1,1);\n		return vec4(lambertianTerm * col, 1.0f);\n	}\n	else\n    {\n		return vec4(1.0, 1.0, 1.0, 1.0);\n    }\n}\n\n@fragment\nfn frag_main(@location(0) fs_UV : vec2<f32>) -> @location(0) vec4<f32>\n{\n    var ray : Ray = rayCast(fs_UV);\n    var raymarchResult : RaymarchResult = raymarchTerrain(ray);\n    var outColor : vec4<f32> = vec4(0,0,0.2,1);\n\n    var terrainColor: vec4<f32> = getTerrainColour(raymarchResult.hitPoint);\n\n    if (raymarchResult.hit)\n    {\n        outColor = terrainColor;\n        // TODO: find a way to optimise this WebGPU non-uniformity nonsense\n        // outColor = getTerrainColour(raymarchResult.hitPoint);\n    }\n\n    // outColor = vec4((uniforms.right), 1);\n\n    return outColor;\n}",l),b=u.createSampler({magFilter:"linear",minFilter:"linear"});u.createTexture({size:[n.width,n.height],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT});let B=u.createBuffer({size:400,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),P=u.createBuffer({size:280,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),R=await fetch("assets/heightfields/hfTest1.png"),T=await createImageBitmap(await R.blob()),[_,S]=[T.width,T.height],U=[0,1].map(()=>u.createTexture({size:[_,S,1],mipLevelCount:1,format:"rgba8unorm",usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT}));u.queue.copyExternalImageToTexture({source:T},{texture:U[x]},[_,S]),R=await fetch("assets/uplifts/lambda.png"),T=await createImageBitmap(await R.blob());let D=u.createTexture({size:[_,S,1],format:"r8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});u.queue.copyExternalImageToTexture({source:T},{texture:D},[T.width,T.height]),R=await fetch("assets/stream/streamInput.png"),T=await createImageBitmap(await R.blob());let G=[0,1].map(()=>u.createTexture({size:[_,S,1],format:"rgba8unorm",usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT}));u.queue.copyExternalImageToTexture({source:T},{texture:G[x]},[_,S]);let V=u.createComputePipeline({layout:"auto",compute:{module:u.createShaderModule({code:"struct SimulationParams {\n  nx         : i32,    // array dimension\n  ny         : i32,\n  lowerVertX : f32,  // lower and upper vertices of the box of the heightfield\n  lowerVertY : f32,\n  upperVertX : f32,\n  upperVertY : f32,\n  cellDiagX  : f32,  // cell diagonal\n  cellDiagY  : f32,\n}\n\n// Uniforms\n@group(0) @binding(0) var<uniform> simParams : SimulationParams;\n\n@group(1) @binding(1) var inElevation : texture_2d<f32>;\n@group(1) @binding(2) var outElevation : texture_storage_2d<rgba8unorm, write>;\n@group(1) @binding(3) var inUplift : texture_2d<f32>;\n@group(1) @binding(4) var inStream : texture_2d<f32>;\n@group(1) @binding(5) var outStream : texture_storage_2d<rgba8unorm, write>;\n\n// ----------- Global parameters -----------\n// 0: Stream power\n// 1: Stream power + Hillslope (Laplacian)\n// 2: Stream power + Hillslope (Laplacian) + Debris slope\nconst erosionMode : i32 = 2;\n\nconst uplift : f32 = 0.005;//0.01;\nconst k : f32 = 0.05;//0.0005;\nconst k_d : f32 = 10.0;\nconst k_h : f32 = 3.0;//2.0;\nconst p_sa : f32 = 1.0;//0.8;\nconst p_sl : f32 = 1.0;//2.0;\nconst dt : f32 = 2.0;//1.0;\n\n// next 8 neighboring cells\nconst neighbors : array<vec2i, 8> = array<vec2i, 8>(\n  vec2i(0, 1), vec2i(1, 1), \n  vec2i(1, 0), vec2i(1, -1), \n  vec2i(0, -1), vec2i(-1, -1), \n  vec2i(-1, 0), vec2i(-1, 1)\n);\n\n// ----------- Utilities -----------\nfn ToIndex1D(i : i32, j : i32) -> i32 { return i + simParams.nx * j; }\n\nfn ToIndex1DFromCoord(p : vec2i) -> i32 { return p.x + simParams.nx * p.y; }\n\nfn Height(p : vec2i) -> f32 {\n    let color = textureLoad(inElevation, vec2u(p), 0);\n    return color.r;\n}\n\nfn UpliftAt(p : vec2i) -> f32 {\n    let color = textureLoad(inUplift, vec2u(p), 0);\n    return color.r; // also greyscale?\n}\n\nfn StreamAt(p : vec2i) -> f32 {\n    let color = textureLoad(inStream, vec2u(p), 0);\n    return color.r; // also greyscale?\n}\n\nfn ArrayPoint(p : vec2i) -> vec2f {\n  let lowerVert = vec2f(simParams.lowerVertX, simParams.lowerVertY);\n  let cellDiag = vec2f(simParams.cellDiagX, simParams.cellDiagY);\n  return lowerVert + vec2f(p) * cellDiag;\n}\n\nfn Point3D(p : vec2i) -> vec3f {\n  return vec3f(ArrayPoint(p), Height(p));\n}\n\nfn Slope(p : vec2i, q : vec2i) -> f32 {\n  if (p.x < 0 || p.x >= simParams.nx || p.y < 0 || p.y >= simParams.ny) { return 0.0; }\n  if (q.x < 0 || q.x >= simParams.nx || q.y < 0 || q.y >= simParams.ny) { return 0.0; }\n  if (p.x == q.x && p.y == q.y) { return 0.0; }\n\n  var d = length(ArrayPoint(q) - ArrayPoint(p));\n  return (Height(q) - Height(p)) / d;\n}\n\nfn GetFlowSteepest(p : vec2i) -> vec2i {\n  var d = vec2i();\n  var maxSlope = 0.0;\n  for (var i = 0; i < 8; i++) {\n      var ss = Slope(p + neighbors[i], p);\n      if (ss > maxSlope) {\n        maxSlope = ss;\n        d = neighbors[i];\n      }\n  }\n  return d;\n}\n\nfn Stream(p : vec2i) -> f32 {\n  if (p.x < 0 || p.x >= simParams.nx || p.y < 0 || p.y >= simParams.ny) { return 0.0; }\n  \n  return StreamAt(p);\n}\n\nfn WaterSteepest(p : vec2i) -> f32 {\n  var water = 0.0;\n  for (var i = 0; i < 8; i++) {\n      var q = p + neighbors[i];\n      var fd = GetFlowSteepest(q);\n      if ((q + fd).x == p.x && (q + fd).y == p.y) {\n        water += Stream(q);\n      }\n  }\n  return water;\n}\n\nfn Laplacian(p : vec2i) -> f32 {\n  var laplacian = 0.0;\n  var i : i32 = p.x;\n  var j : i32 = p.y;\n\n  var sqrCellDiagX = simParams.cellDiagX * simParams.cellDiagX;\n  var sqrCellDiagY = simParams.cellDiagY * simParams.cellDiagY;\n\n  if (i == 0) {\n    laplacian += (Height(p) - 2.0 * Height(vec2i(i+1, j)) + Height(vec2i(i+2, j))) / sqrCellDiagX;\n  }\n  else if (i == simParams.nx - 1) {\n    laplacian += (Height(p) - 2.0 * Height(vec2i(i-1, j)) + Height(vec2i(i-2, j))) / sqrCellDiagX;\n  }\n  else {\n    laplacian += (Height(vec2i(i+1, j)) - 2.0 * Height(vec2i(i, j)) + Height(vec2i(i-1, j))) / sqrCellDiagX;\n  }\n  \n  if (j == 0) {\n    laplacian += (Height(p) - 2.0 * Height(vec2i(i, j+1)) + Height(vec2i(i, j+2))) / sqrCellDiagY;\n  }\n  else if (j == simParams.ny - 1) {\n    laplacian += (Height(p) - 2.0 * Height(vec2i(i, j-1)) + Height(vec2i(i, j-2))) / sqrCellDiagY;\n  }\n  else {\n    laplacian += (Height(vec2i(i, j+1)) - 2.0 * Height(vec2i(i, j)) + Height(vec2i(i, j-1))) / sqrCellDiagY;\n  }\n\n  return laplacian;\n}\n\nfn Read(p : vec2i) -> vec4f {\n  if (p.x < 0 || p.x >= simParams.nx || p.y < 0 || p.y >= simParams.ny) {\n    return vec4f();\n  }\n\n  var ret = vec4f();\n  ret.x = Height(p);        // Bedrock elevation\n  ret.y = StreamAt(p);      // Stream area\n  ret.z = UpliftAt(p);      // Uplift factor\n  return ret;\n}\n\nfn Write(p : vec2i, data : vec4f) {\n  textureStore(outElevation, p, vec4f(data.x));\n  textureStore(outStream, p, vec4f(data.y));\n}\n\n\n@compute @workgroup_size(64)\nfn main(\n  @builtin(workgroup_id) WorkGroupID : vec3<u32>,\n  @builtin(local_invocation_id) LocalInvocationID : vec3<u32>,\n  @builtin(global_invocation_id) GlobalInvocationID : vec3<u32>\n) {\n  let idX = i32(GlobalInvocationID.x);\n  let idY = i32(GlobalInvocationID.y);\n  if (idX < 0 || idY < 0) { return; }\n  if (idX >= simParams.nx || idY >= simParams.ny) { return; }\n\n  var id : i32 = ToIndex1D(idX, idY);\n  var p : vec2i = vec2i(idX, idY);\n  var data : vec4f = Read(p);\n  var cellDiag = vec2f(simParams.cellDiagX, simParams.cellDiagY);\n\n  // Border nodes are fixed to zero (elevation and drainage)\n  if (p.x == 0 || p.x == simParams.nx - 1 ||\n      p.y == 0 || p.y == simParams.ny - 1) {\n    data.x = 0.0;\n    data.y = 1.0 * length(cellDiag);\n    Write(p, data);\n    return;\n  }\n\n  // Flows accumulation at p\n  var waterIncr = WaterSteepest(p);\n\n  data.y = 1.0 * length(cellDiag);\n  data.y += waterIncr;\n\n  // Erosion at p (relative to steepest)\n  var d = GetFlowSteepest(p);\n  var receiver = Read(p + d);\n  var pSlope = abs(Slope(p + d, p));\n\n  var erosion = k * pow(data.y, p_sa) * pow(pSlope, p_sl);\n\n  var newHeight = data.x;\n  if (erosionMode == 0) {           // Stream power\n    newHeight -= dt * (erosion);\n  }\n  else if (erosionMode == 1) {      // Stream power + Hillslope erosion (Laplacian)\n    newHeight -= dt * (erosion - k_h * Laplacian(p));\n  }\n  else if (erosionMode == 2) {      // Stream power + Hillslope erosion (Laplacian) + Debris flow\n    newHeight -= dt * (erosion - k_h * Laplacian(p) - k_d * pSlope);\n  }\n\n  newHeight = max(newHeight, receiver.x);\n  newHeight += dt * uplift * data.z;\n\n  data.x = newHeight;\n  Write(p, data);\n}"}),entryPoint:"main"}}),E=u.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),I=u.createBindGroup({label:"simulation constants",layout:V.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:E}}]}),A=u.createBindGroup({label:"compute bind group 0",layout:V.getBindGroupLayout(1),entries:[{binding:1,resource:U[0].createView()},{binding:2,resource:U[1].createView()},{binding:3,resource:D.createView()},{binding:4,resource:G[0].createView()},{binding:5,resource:G[1].createView()}]}),M=u.createBindGroup({label:"compute bind group 1",layout:V.getBindGroupLayout(1),entries:[{binding:1,resource:U[1].createView()},{binding:2,resource:U[0].createView()},{binding:3,resource:D.createView()},{binding:4,resource:G[1].createView()},{binding:5,resource:G[0].createView()}]}),C=[A,M];i.createTerrainBindGroup(w,B,0,b,U[x],P),r.createBindGroup(y,B,256,b,U[x]);let L=new m;u.queue.writeBuffer(E,0,new Float32Array([L.nx,L.ny,L.lowerVertX,L.lowerVertY,L.upperVertX,L.upperVertY,L.cellDiagX,L.cellDiagY])),requestAnimationFrame(function frame(){if(!t.active)return;h.update();let e=u.createCommandEncoder();{let n=e.beginComputePass();n.setPipeline(V),n.setBindGroup(0,I),n.setBindGroup(1,C[x]),n.dispatchWorkgroups(Math.ceil(_),Math.ceil(S)),n.end(),x=(x+1)%2}{let n=e.beginRenderPass({colorAttachments:[{view:c.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});n.setPipeline(w),writeMVPUniformBuffer(u,B,0,i.getModelMatrix(),h,!0),function(e,n,t){e.queue.writeBuffer(n,0,new Float32Array([t.nx,t.ny,t.lowerVertX,t.lowerVertY,t.upperVertX,t.upperVertY]))}(u,P,L),n.setBindGroup(0,i.bindGroup),n.setIndexBuffer(i.indexBuffer,"uint32"),n.setVertexBuffer(0,i.posBuffer),n.setVertexBuffer(1,i.normalBuffer),n.setVertexBuffer(2,i.uvBuffer),n.drawIndexed(i.count),n.end()}{let n=e.beginRenderPass({colorAttachments:[{view:c.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"load",storeOp:"store"}]});n.setPipeline(y),writeMVPUniformBuffer(u,B,256,r.getModelMatrix(),h,!0),n.setBindGroup(0,r.bindGroup),n.setIndexBuffer(r.indexBuffer,"uint32"),n.setVertexBuffer(0,r.posBuffer),n.setVertexBuffer(1,r.normalBuffer),n.setVertexBuffer(2,r.uvBuffer),n.drawIndexed(r.count),n.end()}u.queue.submit([e.finish()]),requestAnimationFrame(frame)})};var pages=()=>makeSample({name:"Terrain X",description:"Interactive terrain authoring and erosion simulation on WebGPU",gui:!0,stats:!0,init,filename:"src/sample/terrainX/main.ts"})},4131:function(e){e.exports={canvasContainer:"SampleLayout_canvasContainer__ZTWP5"}}},function(e){e.O(0,[746,150,774,888,179],function(){return e(e.s=8312)}),_N_E=e.O()}]);