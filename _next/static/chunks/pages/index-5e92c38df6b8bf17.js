(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[405],{8312:function(e,t,r){(window.__NEXT_P=window.__NEXT_P||[]).push(["/",function(){return r(559)}])},559:function(e,t,r){"use strict";let n,i,a,o;r.r(t),r.d(t,{default:function(){return pages}});var s,u,c,l,f,p,h=r(6416),d=r(5893),m=r(9008),g=r.n(m),v=r(7294),x=r(4131),b=r.n(x);let SampleLayout=e=>{let t=(0,v.useRef)(null),n=(0,v.useRef)(null),i=(0,v.useMemo)(()=>{if(e.gui){let e=r(4376);return new e.GUI({autoPlace:!1})}},[]),a=(0,v.useRef)(null),o=(0,v.useMemo)(()=>{if(e.stats){let e=r(2792);return new e}},[]),[s,u]=(0,v.useState)(null);return(0,v.useEffect)(()=>{if(i&&n.current)for(n.current.appendChild(i.domElement);i.__controllers.length>0;)i.__controllers[0].remove();o&&a.current&&(o.dom.style.position="absolute",o.showPanel(1),a.current.appendChild(o.dom));let r={active:!0};try{let n=t.current;if(!n)throw Error("The canvas is not available");let a=e.init({canvas:n,pageState:r,gui:i,stats:o});a instanceof Promise&&a.catch(e=>{console.error(e),u(e)})}catch(e){console.error(e),u(e)}return()=>{r.active=!1}},[]),(0,d.jsxs)("main",{children:[(0,d.jsxs)(g(),{children:[(0,d.jsx)("title",{children:"Terrain X"}),(0,d.jsx)("meta",{name:"description",content:e.description}),(0,d.jsx)("meta",{httpEquiv:"origin-trial",content:e.originTrial})]}),(0,d.jsxs)("div",{children:[(0,d.jsx)("h1",{children:e.name}),(0,d.jsx)("a",{target:"_blank",rel:"noreferrer",href:"https://github.com/".concat("GPU-Gang/WebGPU-Erosion-Simulation","/tree/main/").concat(e.filename),children:"See it on Github!"}),(0,d.jsx)("p",{children:e.description}),s?(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("p",{children:"Something went wrong. Do your browser and device support WebGPU?"}),(0,d.jsx)("p",{children:"".concat(s)})]}):null]}),(0,d.jsxs)("div",{className:b().canvasContainer,children:[(0,d.jsx)("div",{style:{position:"absolute",left:10},ref:a}),(0,d.jsx)("div",{style:{position:"absolute",right:10},ref:n}),(0,d.jsx)("canvas",{ref:t})]})]})},makeSample=e=>(0,d.jsx)(SampleLayout,{...e});var w=r(4478),y=class{setResolution(e){this.resolution=e,this.aspectRatio=e[0]/e[1]}updateProjectionMatrix(){h._E.perspective(this.fovy,this.aspectRatio,this.near,this.far,this.projectionMatrix)}update(){this.controls.tick();let e=this.viewMatrix();this.right[0]=-e[0],this.right[1]=-e[4],this.right[2]=-e[8],this.up[0]=e[1],this.up[1]=e[5],this.up[2]=e[9],this.forward[0]=-e[2],this.forward[1]=-e[6],this.forward[2]=-e[10]}viewMatrix(){return this.controls.matrix}getPosition(){return this.controls.eye}constructor(e,t){this.projectionMatrix=h._E.create(),this.fovy=45,this.aspectRatio=1,this.near=.1,this.far=1e6,this.resolution=h.K4.create(400,400),this.right=h.R3.create(1,0,0),this.up=h.R3.create(0,1,0),this.forward=h.R3.create(0,0,1),this.controls=w(document.getElementById("canvas"),{eye:e,center:t,translateSpeed:-1,mode:"orbit"}),this.controls.flipX=!0,this.controls.flipY=!0,this.controls.rotate(0,3.14159,0)}},B=class{create(e){this.device=e}createIndexBuffer(){return this.idxBound||(this.idxBound=!0,this.indexBuffer=this.device.createBuffer({size:this.indices.byteLength,usage:GPUBufferUsage.INDEX,mappedAtCreation:!0}),new Uint32Array(this.indexBuffer.getMappedRange()).set(this.indices),this.indexBuffer.unmap()),this.indexBuffer}createPosBuffer(){return this.posBound||(this.posBound=!0,this.posBuffer=this.device.createBuffer({size:this.positions.byteLength,usage:GPUBufferUsage.VERTEX,mappedAtCreation:!0}),new Float32Array(this.posBuffer.getMappedRange()).set(this.positions),this.posBuffer.unmap()),this.posBuffer}createNormalBuffer(){return this.norBound||(this.norBound=!0,this.normalBuffer=this.device.createBuffer({size:this.normals.byteLength,usage:GPUBufferUsage.VERTEX,mappedAtCreation:!0}),new Float32Array(this.normalBuffer.getMappedRange()).set(this.normals),this.normalBuffer.unmap()),this.normalBuffer}createUVBuffer(){return this.uvBound||(this.uvBound=!0,this.uvBuffer=this.device.createBuffer({size:this.uvs.byteLength,usage:GPUBufferUsage.VERTEX,mappedAtCreation:!0}),new Float32Array(this.uvBuffer.getMappedRange()).set(this.uvs),this.uvBuffer.unmap()),this.uvBuffer}elemCount(){return this.count}constructor(){this.count=0,this.idxBound=!1,this.posBound=!1,this.norBound=!1,this.uvBound=!1}};function degToRad(e){return .0174533*e}var P=class extends B{create(e){super.create(e),this.indices=new Uint32Array([0,1,2,0,2,3]),this.normals=new Float32Array([0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0]),this.positions=new Float32Array([-1,-1,0,1,1,-1,0,1,1,1,0,1,-1,1,0,1]),this.uvs=new Float32Array([0,1,1,1,1,0,0,0]),this.count=this.indices.length,this.createIndexBuffer(),this.createPosBuffer(),this.createNormalBuffer(),this.createUVBuffer()}createBindGroup(e,t,r,n,i){return this.bindGroupCreated||(this.bindGroupCreated=!0,this.bindGroup=this.device.createBindGroup({layout:e.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:t,offset:r}},{binding:1,resource:n},{binding:2,resource:i.createView()}]})),this.bindGroup}getModelMatrix(){let e=h._E.identity();return h._E.rotateX(e,this.rotation[0],e),h._E.rotateY(e,this.rotation[1],e),h._E.rotateZ(e,this.rotation[2],e),h._E.scale(e,this.scale,e),h._E.translate(e,this.center,e),e}constructor(e=h.vh.create(0,0,0,0),t=h.R3.create(1,1,1),r=h.R3.create(0,0,0)){super(),this.bindGroupCreated=!1,this.center=h.vh.fromValues(e[0],e[1],e[2],1),this.scale=t,this.rotation=r,this.rotation[0]=degToRad(this.rotation[0]),this.rotation[1]=degToRad(this.rotation[1]),this.rotation[2]=degToRad(this.rotation[2])}},T=class extends P{createTerrainBindGroup(e,t,r,n,i,a){return this.bindGroupCreated||(this.bindGroupCreated=!0,this.bindGroup=this.device.createBindGroup({layout:e.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:t,offset:r}},{binding:1,resource:n},{binding:2,resource:i.createView()},{binding:3,resource:{buffer:a,offset:0}}]})),this.bindGroup}},R=class{constructor(){this.nx=256,this.ny=256,this.lowerVertX=-5,this.lowerVertY=-5,this.upperVertX=5,this.upperVertY=5,this.cellDiagX=1176.47,this.cellDiagY=1176.47}};let _=(()=>{let e,t;let r={};return function(n,i){t||(t=n.createShaderModule({label:"textured quad shaders for mip level generation",code:"struct VertexOutput {\r\n    @builtin(position) position : vec4f,\r\n    @location(0) texCoord : vec2f,\r\n}\r\n\r\n@vertex\r\nfn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {\r\n    var pos = array<vec2f, 4>(\r\n        vec2f(-1, 1), vec2f(1, 1),\r\n        vec2f(-1, -1), vec2f(1, -1)\r\n    );\r\n    var output : VertexOutput;\r\n    output.texCoord = pos[vertexIndex] * vec2f(0.5, -0.5) + vec2f(0.5);\r\n    output.position = vec4f(pos[vertexIndex], 0, 1);\r\n    return output;\r\n}\r\n\r\n@group(0) @binding(0) var imgSampler : sampler;\r\n@group(0) @binding(1) var img : texture_2d<f32>;\r\n\r\n@fragment\r\nfn fragmentMain(@location(0) texCoord : vec2f) -> @location(0) vec4f {\r\n    return textureSample(img, imgSampler, texCoord);\r\n}"}),e=n.createSampler({minFilter:"linear"})),r[i.format]||(r[i.format]=n.createRenderPipeline({label:"mip level generator pipeline",layout:"auto",vertex:{module:t,entryPoint:"vertexMain"},fragment:{module:t,entryPoint:"fragmentMain",targets:[{format:i.format}]},primitive:{topology:"triangle-strip",stripIndexFormat:"uint32"}}));let a=r[i.format],o=n.createCommandEncoder({label:"mip gen encoder"}),s=i.width,u=i.height,c=0;for(;s>1||u>1;){s=Math.max(1,s/2|0),u=Math.max(1,u/2|0);let t=n.createBindGroup({layout:a.getBindGroupLayout(0),entries:[{binding:0,resource:e},{binding:1,resource:i.createView({baseMipLevel:c,mipLevelCount:1})}]});++c;let r={label:"mip gen canvas renderPass",colorAttachments:[{view:i.createView({baseMipLevel:c,mipLevelCount:1}),loadOp:"clear",storeOp:"store"}]},l=o.beginRenderPass(r);l.setPipeline(a),l.setBindGroup(0,t),l.draw(4),l.end()}let l=o.finish();n.queue.submit([l])}})(),numMipLevels=function(){for(var e=arguments.length,t=Array(e),r=0;r<e;r++)t[r]=arguments[r];let n=Math.max(...t);return 1+Math.log2(n)|0};async function loadImageBitmap(e){let t=await fetch(e),r=await t.blob();return await createImageBitmap(r,{colorSpaceConversion:"none"})}async function createTextureFromImageWithMip(e,t,r){let n=await loadImageBitmap(t);return function(e,t,r,n){let i=e.createTexture({label:t,format:"rgba8unorm",mipLevelCount:n.mips?numMipLevels(r.width,r.height):1,size:[r.width,r.height],usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});return console.log("mip count: "+i.mipLevelCount),!function(e,t,r,n){let{flipY:i}=n;e.queue.copyExternalImageToTexture({source:r,flipY:i},{texture:t},{width:r.width,height:r.height}),t.mipLevelCount>1&&_(e,t)}(e,i,r,!!n.flipY&&n.flipY),i}(e,t,n,r)}r(2792);let S="assets/heightfields/",I="assets/uplifts/",U=["hfTest1","hfTest2"],D=["alpes_noise","lambda"],V=["pattern1_bg","pattern2_bg","pattern3_bg"];(s=l||(l={}))[s.hfTest1=0]="hfTest1",s[s.hfTest2=1]="hfTest2",(u=f||(f={}))[u.alpes_noise=0]="alpes_noise",u[u.lambda=1]="lambda",(c=p||(p={}))[c.pattern1_bg=0]="pattern1_bg",c[c.pattern2_bg=1]="pattern2_bg",c[c.pattern3_bg=2]="pattern3_bg";let C=[],G=[],A=[],M=[],E=0,L=!1,Y=0,N=0,X=h.K4.fromValues(-1,-1);function createRenderPipeline(e,t,r){let n=e.createRenderPipeline({layout:"auto",vertex:{module:e.createShaderModule({code:t}),entryPoint:"vert_main",buffers:[{arrayStride:16,attributes:[{shaderLocation:0,format:"float32x4",offset:0}]},{arrayStride:16,attributes:[{shaderLocation:1,format:"float32x4",offset:0}]},{arrayStride:8,attributes:[{shaderLocation:2,format:"float32x2",offset:0}]}]},fragment:{module:e.createShaderModule({code:t}),entryPoint:"frag_main",targets:[{format:r}]},primitive:{topology:"triangle-list",cullMode:"back"}});return n}function writeMVPUniformBuffer(e,t,r,n,i){let a=arguments.length>5&&void 0!==arguments[5]&&arguments[5],o=h._E.identity();var s=i.viewMatrix();a?h._E.multiply(o,n,o):(h._E.multiply(s,n,o),h._E.multiply(i.projectionMatrix,o,o)),e.queue.writeBuffer(t,r,new Float32Array([o[0],o[1],o[2],o[3],o[4],o[5],o[6],o[7],o[8],o[9],o[10],o[11],o[12],o[13],o[14],o[15],i.right[0],i.right[1],i.right[2],0,i.up[0],i.up[1],i.up[2],0,i.forward[0],i.forward[1],i.forward[2],0,i.getPosition()[0],i.getPosition()[1],i.getPosition()[2],0,i.resolution[0],i.resolution[1],0,0]))}let createTextureFromImage=(e,t,r,n,i)=>{let a=e.createTexture({label:i,size:[t.width,t.height,1],format:r?"r8unorm":"rgba8unorm",mipLevelCount:1,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT|(!r&&GPUTextureUsage.STORAGE_BINDING)|(!r&&GPUTextureUsage.COPY_SRC)});return n&&e.queue.copyExternalImageToTexture({source:t},{texture:a},[t.width,t.height]),a},init=async e=>{let{canvas:t,pageState:r,gui:s,stats:u}=e;s.width=280;let c={heightfield:U[0],uplift:D[0],eraseTerrain:!1,useCustomBrush:!1,customBrush:V[0],brushScale:5,brushStrength:5},d=-1;s.add(c,"heightfield",U).onFinishChange(()=>{d=0}),s.add(c,"uplift",D).onFinishChange(()=>{n=G[f[c.uplift]],d=1}),s.add(c,"eraseTerrain"),s.add(c,"useCustomBrush"),s.add(c,"customBrush",V).onFinishChange(()=>{i=A[p[c.customBrush]],d=2}),s.add(c,"brushScale",0,10,1),s.add(c,"brushStrength",0,20);let m=await navigator.gpu.requestAdapter(),g=await m.requestDevice();if(!r.active)return;let v=t.getContext("webgpu"),x=window.devicePixelRatio;t.width=t.clientWidth*x,t.height=t.clientHeight*x;let b=navigator.gpu.getPreferredCanvasFormat();t.addEventListener("mousedown",e=>{e.ctrlKey&&(e.stopImmediatePropagation(),L=!0,Y=e.offsetX,N=e.offsetY)},!0),t.addEventListener("mousemove",e=>{e.ctrlKey&&(e.stopImmediatePropagation(),0==e.button&&(Y=e.offsetX,N=e.offsetY))},!0),t.addEventListener("mouseup",()=>{L=!1}),v.configure({device:g,format:b,alphaMode:"premultiplied"}),(a=new P(h.vh.create(2.5,2.5,0,0),h.R3.create(.3,.3,1))).create(g),(o=new T(h.vh.create(0,0,0,0),h.R3.create(1,1,1))).create(g),u.showPanel(0);let w=h.R3.create(o.center[0],o.center[1]+2,o.center[2]),B=new y(h.R3.create(0,0,-10),w);B.setResolution(h.K4.create(t.width,t.height)),B.updateProjectionMatrix();let _=createRenderPipeline(g,"struct Uniforms {\n  modelViewProjectionMatrix : mat4x4<f32>,\n}\n@group(0) @binding(0) var<uniform> uniforms : Uniforms;\n\n@group(0) @binding(1) var mySampler : sampler;\n@group(0) @binding(2) var myTexture : texture_2d<f32>;\n\nstruct VertexOutput {\n  @builtin(position) Position : vec4<f32>,\n  @location(0) fs_UV : vec2<f32>,\n}\n\n@vertex\nfn vert_main(\n  @location(0) vs_pos: vec4<f32>,\n  @location(1) vs_nor: vec4<f32>,\n  @location(2) vs_uv: vec2<f32>) -> VertexOutput {\n  var output : VertexOutput;\n  output.Position = uniforms.modelViewProjectionMatrix * vs_pos;\n  output.fs_UV = vs_uv;\n  return output;\n}\n\n@fragment\nfn frag_main(@location(0) fs_UV : vec2<f32>) -> @location(0) vec4<f32> {\n  return textureSample(myTexture, mySampler, fs_UV);\n}",b),O=createRenderPipeline(g,"struct Uniforms {\n  modelViewProjectionMatrix : mat4x4<f32>,\n  right: vec3<f32>,\n  up: vec3<f32>,\n  forward: vec3<f32>,\n  eye: vec3<f32>,\n  screenDims: vec2<f32>,\n}\n\nstruct Terrain\n{\n    textureSize: vec2<i32>, // texture size\n    lowerLeft: vec2<f32>,   // AABB\n    upperRight: vec2<f32>,  // AABB\n}\n\n@group(0) @binding(0) var<uniform> uniforms : Uniforms;\n@group(0) @binding(1) var heightFieldSampler : sampler;\n@group(0) @binding(2) var heightfield : texture_2d<f32>;\n@group(0) @binding(3) var<uniform> terrain : Terrain;\n\nstruct VertexOutput {\n  @builtin(position) Position : vec4<f32>,\n  @location(0) fs_UV : vec2<f32>,\n}\n\n@vertex\nfn vert_main(\n  @location(0) vs_pos: vec4<f32>,\n  @location(1) vs_nor: vec4<f32>,\n  @location(2) vs_uv: vec2<f32>) -> VertexOutput {\n  var output : VertexOutput;\n  output.Position = uniforms.modelViewProjectionMatrix * vs_pos;\n  output.fs_UV = vs_uv;\n  return output;\n}\n\n// ----------- FRAG SHADER ------------ //\n\nconst PI : f32 = 3.14159265358979323;\nconst FOVY : f32 = 45.0f * PI / 180.0;\nconst MAX_ITERS : i32 = 256;\nconst MIN_DIST : f32 = 0.01f;\nconst MAX_DIST : f32 = 1000000.0f;\nconst EPSILON : f32 = MIN_DIST;\nconst heightRange : vec2<f32> = vec2(0, 1);       // hardcoded range for now\nconst K: f32 = 1.0f;                              // hardcoded Lipschitz constant\nconst lightPos: vec3<f32> = vec3(5, 12, -5);       // light position\n\n// Data structures\nstruct Ray {\n    origin: vec3<f32>,\n    direction: vec3<f32>,\n};\n\nstruct IntersectAABBResult\n{\n    hit: bool,\n    tNear: f32,\n    tFar: f32\n}\n\nstruct RaymarchResult\n{\n    hit: bool,\n    t: f32,\n    hitPoint: vec3<f32>,\n}\n\n/* =================================\n * ========= RAY FUNCTIONS =========\n * =================================\n*/\n\nfn rayCast(fs_UV: vec2<f32>) -> Ray\n{\n    var ndc : vec2<f32> = (fs_UV);\n    ndc = ndc * 2.f - vec2(1.f);\n\n    let aspect : f32 = uniforms.screenDims.x / uniforms.screenDims.y;\n    let reference : vec3<f32> = uniforms.eye + uniforms.forward;\n    let V : vec3<f32> = uniforms.up * tan(FOVY * 0.5);\n    let H : vec3<f32> = uniforms.right * tan(FOVY * 0.5) * aspect;\n    let p : vec3<f32> = reference + H * ndc.x + V * ndc.y;\n\n    return Ray(uniforms.eye, normalize(p - uniforms.eye));\n}\n\nfn intersectAABB(ray: Ray) -> IntersectAABBResult\n{\n    var result : IntersectAABBResult;\n    result.hit = false;\n    result.tNear = -1;\n    result.tFar = -1;\n\n	var rinvDir : vec3<f32> = 1.0 / ray.direction;\n	var delta : f32 = 0.1 * (heightRange.y - heightRange.x);\n	var tbot : vec3<f32> = rinvDir * (vec3(terrain.lowerLeft.x, heightRange.x - delta, terrain.lowerLeft.y) - ray.origin);\n	var ttop : vec3<f32> = rinvDir * (vec3(terrain.upperRight.x, heightRange.y + delta, terrain.upperRight.y) - ray.origin);\n\n	var tmin : vec3<f32> = min(ttop, tbot);\n	var tmax : vec3<f32> = max(ttop, tbot);\n	var t : vec2<f32> = max(tmin.xx, tmin.yz);\n	var t0 : f32 = max(t.x, t.y);\n	t = min(tmax.xx, tmax.yz);\n	var t1 : f32 = min(t.x, t.y);\n\n    result.hit = t1 > max(t0, 0.0);\n    result.tNear = t0;\n    result.tFar = t1;\n\n    return result;\n}\n\n/* ===============================\n * ======== SDF Primitives =======\n * ===============================\n*/\n\nfn sdfSphere(p: vec3<f32>) -> f32\n{\n    return distance(p, vec3(0,0,0)) - 0.257f;\n}\n\nfn sdfBox2D(p: vec2<f32>, lowerLeft: vec2<f32>, upperRight: vec2<f32>) -> f32\n{\n	var center: vec2<f32> = 0.5 * (lowerLeft + upperRight);\n	var r: vec2<f32> = 0.5 * (upperRight - lowerLeft);\n	var q: vec2<f32> = abs(p - center) - r;\n    return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0);\n}\n\nfn sdfBox3D(p: vec3<f32>, lowerLeft: vec3<f32>, upperRight: vec3<f32>) -> f32\n{\n	var center: vec3<f32> = 0.5 * (lowerLeft + upperRight);\n	var r: vec3<f32> = 0.5 * (upperRight - lowerLeft);\n	var q: vec3<f32> = abs(p - center) - r;\n	return length(max(q, vec3(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);\n}\n\n/* ==================================\n * ========= Operations =========\n * ==================================\n*/\n\n// Intersection from IQ\nfn sdfIntersection(sdfA: f32, sdfB: f32) -> f32\n{\n	return max(sdfA, sdfB);\n}\n\n// Remap a value in one range to a different range\nfn remap(val: f32, oldMin: f32, oldMax: f32, newMin: f32, newMax: f32) -> f32\n{\n	return newMin + (newMax - newMin) * ((val - oldMin) / (oldMax - oldMin));\n}\n\n/* ============================================\n * ======== Heightfield calculations ==========\n * ============================================\n*/\n\n// Read height from the heightfield texture given a world point\n// returns height at point\nfn getTerrainElevation(p: vec2<f32>) -> f32\n{\n    // calculate the uv value between 0 and 1\n	var numerator: vec2<f32> = p - terrain.lowerLeft;       // lower left to current point\n	var denom: vec2<f32> = terrain.upperRight - terrain.lowerLeft;  // full range\n	var uv: vec2<f32> = numerator / denom;    // remap the vec2 point to a 0->1 range\n\n    var heightCol : vec4<f32> = textureSample(heightfield, heightFieldSampler, uv);\n    var height : f32 = heightCol.r; // black and white means same colour in all channels\n    \n    // this is between 0 and 1 --> remap to correct height range\n	return remap(height, 0.0f, 1.0f, heightRange.x, heightRange.y);\n}\n\n/* ============================================\n * ============ Main Raymarching ==============\n * ============================================\n*/\n\n// Signed distance field object\n// returns signed distance value for the terrain at the point p.\nfn terrainSdf(p: vec3<f32>) -> f32 {\n	var t : f32 = p.y - getTerrainElevation(p.xz);\n	var delta : f32 = 0.1f * (heightRange.y - heightRange.x);\n    \n    var boxSdf: f32 = sdfBox3D(p, \n                                vec3(terrain.lowerLeft.x, heightRange.x - delta, terrain.lowerLeft.y),\n                                vec3(terrain.upperRight.x, heightRange.y + delta, terrain.upperRight.y));\n\n    return sdfIntersection(boxSdf, t);\n}\n\nfn raymarchTerrain(ray: Ray) -> RaymarchResult\n{\n    var result : RaymarchResult;\n    result.hit = false;\n    result.t = -1;\n\n    var aabbTest = intersectAABB(ray);\n\n    // TODO: find a way to re-enable this optimisation because WebGPU has over strict uniformity analysis\n    // if (!aabbTest.hit)\n    // {\n    //     // didn't hit AABB\n    //     // def not hitting terrain\n    //     return result;\n    // }\n\n    var t : f32 = max(MIN_DIST, aabbTest.tNear);        // start at the point of intersection with the AABB, don't waste unnecessary marching steps\n    var dist : f32 = 0;\n    var p: vec3<f32>;\n    \n    // Lipschitz bound is dependent on ray direction\n	var uz: f32 = abs(ray.direction.y);\n	var kr: f32 = uz + K * sqrt(1.0f - (uz * uz));\n\n    for (var i : i32 = 0; i<MAX_ITERS; i++)\n    {\n        // TODO: find a way to re-enable this optimisation because WebGPU has over strict uniformity analysis\n        // if (t < aabbTest.tFar)\n        // {\n        //     // passed the AABB and didn't hit anything\n        //     // stop raymarching\n        //     break;\n        // }\n\n        p = ray.origin + ray.direction * t;\n\n        dist = terrainSdf(p);\n\n        if (dist < 0.0f && !result.hit)\n        {\n            result.hit = true;\n            result.t = t;\n            result.hitPoint = p;\n\n            // break;   // stupid webgpu uniformity analysis issue. TODO: find a way to optimise here\n        }\n\n        if (dist >= MAX_DIST)\n        {\n            // break;   // stupid webgpu uniformity analysis issue. TODO: find a way to optimise here\n        }\n\n        t += max(dist / kr, MIN_DIST);\n    }\n\n    return result;\n}\n\n/* ============================================\n * ================= Shading ==================\n * ============================================\n*/\n\nfn computeNormal(p: vec3<f32>, eps: vec2<f32>) -> vec3<f32>\n{\n    var e: vec3<f32> = vec3(eps.x, 0.0, eps.y);\n    return normalize(vec3(getTerrainElevation(p.xz + e.xy) - getTerrainElevation(p.xz - e.xy),\n                            getTerrainElevation(p.xz + e.yz) - getTerrainElevation(p.xz - e.yz),\n                            length(eps)\n    ));\n}\n\nfn getTerrainColour(p: vec3<f32>) -> vec4<f32>\n{\n    // TODO: texture size should probably be higher when we get it from the CPU\n    var n: vec3<f32> = computeNormal(p, vec2(EPSILON));//(terrain.upperRight - terrain.lowerLeft) / vec2<f32>(terrain.textureSize));\n\n	// Terrain sides and bottom\n	if (abs(sdfBox2D(p.xz, terrain.lowerLeft, terrain.upperRight)) < EPSILON\n        || abs(p.y - heightRange.x + 0.1f * (heightRange.y - heightRange.x)) < EPSILON)\n    {\n        return vec4(0.3f, 0.29f, 0.31f, 1.0f);\n    }\n	\n    var shadingMode: i32 = 0;       // hardcoded\n\n	// Terrain interior\n	if (shadingMode == 0)   // normals\n	{\n        // TODO: find a way to optimise this non-uniformity nonsense\n		// var n: vec3<f32> = computeNormal(p, (terrain.upperRight - terrain.lowerLeft) / vec2<f32>(terrain.textureSize));\n		return vec4(0.2 * (vec3(3.0) + 2.0 * n.xyz), 1.0);\n	}\n	else if (shadingMode == 1)  // lambertian\n	{\n		var lightDir: vec3<f32> = normalize(vec3(0,0,0) - lightPos); // terrain located at world 0,0,0\n        var ambientTerm: f32 = 0.2;\n        var lambertianTerm: vec3<f32> = vec3(max(dot(n, lightDir), 0.0f) + ambientTerm);\n        \n        var col: vec3<f32> = vec3(1,1,1);\n		return vec4(lambertianTerm * col, 1.0f);\n	}\n	else\n    {\n		return vec4(1.0, 1.0, 1.0, 1.0);\n    }\n}\n\n@fragment\nfn frag_main(@location(0) fs_UV : vec2<f32>) -> @location(0) vec4<f32>\n{\n    var ray : Ray = rayCast(fs_UV);\n    var raymarchResult : RaymarchResult = raymarchTerrain(ray);\n    var outColor : vec4<f32> = vec4(0,0,0.2,1);\n\n    var terrainColor: vec4<f32> = getTerrainColour(raymarchResult.hitPoint);\n\n    if (raymarchResult.hit)\n    {\n        outColor = terrainColor;\n        // TODO: find a way to optimise this WebGPU non-uniformity nonsense\n        // outColor = getTerrainColour(raymarchResult.hitPoint);\n    }\n\n    // outColor = vec4((uniforms.right), 1);\n\n    return outColor;\n}\n",b),F=g.createSampler({magFilter:"linear",minFilter:"linear"});g.createTexture({size:[t.width,t.height],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT});let H=g.createBuffer({size:400,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),q=g.createBuffer({size:280,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),j=await fetch(S+c.heightfield+".png"),z=await createImageBitmap(await j.blob()),[k,W]=[z.width,z.height];M=[0,1].map(e=>createTextureFromImage(g,z,!1,!1,"hf_".concat(c.heightfield,"_").concat(e))),g.queue.copyExternalImageToTexture({source:z},{texture:M[E]},[k,W]),C.push(createTextureFromImage(g,z,!1,!0,"hf_".concat(c.heightfield)));let K=U[1];j=await fetch(S+K+".png"),z=await createImageBitmap(await j.blob()),C.push(createTextureFromImage(g,z,!1,!0,"hf_".concat(K))),j=await fetch(I+c.uplift+".png"),z=await createImageBitmap(await j.blob());let Z=[0,1].map(e=>createTextureFromImage(g,z,!1,!1,"uplift_".concat(c.uplift,"_").concat(e)));g.queue.copyExternalImageToTexture({source:z},{texture:Z[E]},[z.width,z.height]),n=createTextureFromImage(g,z,!0,!0,"uplift_".concat(c.uplift)),G.push(n),K=D[1],j=await fetch(I+K+".png"),z=await createImageBitmap(await j.blob()),G.push(createTextureFromImage(g,z,!0,!0,"uplift_".concat(K))),j=await fetch("assets/stream/streamInput.png"),z=await createImageBitmap(await j.blob());let Q=[0,1].map(()=>g.createTexture({size:[k,W,1],format:"rgba8unorm",usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT}));g.queue.copyExternalImageToTexture({source:z},{texture:Q[E]},[k,W]),i=(A=await Promise.all([await createTextureFromImageWithMip(g,"".concat(I).concat(V[0],".png"),{mips:!0,flipY:!1}),await createTextureFromImageWithMip(g,"".concat(I).concat(V[1],".png"),{mips:!0,flipY:!1}),await createTextureFromImageWithMip(g,"".concat(I).concat(V[2],".png"),{mips:!0,flipY:!1})]))[0];let J=g.createComputePipeline({layout:"auto",compute:{module:g.createShaderModule({code:"struct SimulationParams {\n  nx         : i32,     // array dimension\n  ny         : i32,\n  lowerVertX : f32,     // lower and upper vertices of the box of the heightfield\n  lowerVertY : f32,\n  upperVertX : f32,\n  upperVertY : f32,\n  cellDiagX  : f32,     // cell diagonal\n  cellDiagY  : f32,\n}\n\nstruct CustomBrushParams {\n  brushPosX     : f32,\n  brushPosY     : f32,\n  brushScale    : f32,\n  brushStrength : f32,\n  width         : i32,  // brush texture size\n  height        : i32,\n  erase         : f32,  // temp boolean to erase terrain\n  useCustomBrush: f32,  // boolean\n  // TODO: rotation\n}\n\nstruct AABB {\n  lowerLeft   : vec2<f32>,\n  upperRight  : vec2<f32>,\n}\n\n// Uniforms\n@group(0) @binding(0) var<uniform> simParams : SimulationParams;\n\n@group(1) @binding(1) var inElevation : texture_2d<f32>;\n@group(1) @binding(2) var outElevation : texture_storage_2d<rgba8unorm, write>;\n@group(1) @binding(3) var inUplift : texture_2d<f32>;\n@group(1) @binding(4) var outUplift : texture_storage_2d<rgba8unorm, write>;\n@group(1) @binding(5) var inStream : texture_2d<f32>;\n@group(1) @binding(6) var outStream : texture_storage_2d<rgba8unorm, write>;\n\n@group(2) @binding(0) var<uniform> customBrushParams : CustomBrushParams;\n@group(2) @binding(1) var customBrush : texture_2d<f32>;\n// @group(2) @binding(2) var brushSampler : sampler;\n\n// ----------- Global parameters -----------\n// 0: Stream power\n// 1: Stream power + Hillslope (Laplacian)\n// 2: Stream power + Hillslope (Laplacian) + Debris slope\nconst erosionMode : i32 = 2;\n\nconst uplift : f32 = 0.005;//0.01;\nconst k : f32 = 0.05;//0.0005;\nconst k_d : f32 = 10.0;\nconst k_h : f32 = 3.0;//2.0;\nconst p_sa : f32 = 1.0;//0.8;\nconst p_sl : f32 = 1.0;//2.0;\nconst dt : f32 = 2.0;//1.0;\n\n// next 8 neighboring cells\nconst neighbors : array<vec2i, 8> = array<vec2i, 8>(\n  vec2i(0, 1), vec2i(1, 1), \n  vec2i(1, 0), vec2i(1, -1), \n  vec2i(0, -1), vec2i(-1, -1), \n  vec2i(-1, 0), vec2i(-1, 1)\n);\n\n// ----------- Utilities -----------\nfn ToIndex1D(i : i32, j : i32) -> i32 { return i + simParams.nx * j; }\n\nfn ToIndex1DFromCoord(p : vec2i) -> i32 { return p.x + simParams.nx * p.y; }\n\nfn Height(p : vec2i) -> f32 {\n    let color = textureLoad(inElevation, vec2u(p), 0);\n    return color.r;\n}\n\nfn UpliftAt(p : vec2i) -> f32 {\n    var color = textureLoad(inUplift, vec2u(p), 0);\n\n    var pf = vec2f(p);\n    if (customBrushParams.brushPosX != -1 && customBrushParams.brushPosY != -1) {\n      if (customBrushParams.useCustomBrush == 1) {\n        color.r = DrawBrush(pf, color.r);\n      }\n      else {\n        color.r = DrawPaint(pf, color.r);\n      }\n    }\n\n    textureStore(outUplift, p, vec4f(vec3f(color.r), 1.f));\n    return color.r; // also greyscale?\n}\n\nfn StreamAt(p : vec2i) -> f32 {\n    let color = textureLoad(inStream, vec2u(p), 0);\n    return color.r; // also greyscale?\n}\n\nfn ArrayPoint(p : vec2i) -> vec2f {\n  let lowerVert = vec2f(simParams.lowerVertX, simParams.lowerVertY);\n  let cellDiag = vec2f(simParams.cellDiagX, simParams.cellDiagY);\n  return lowerVert + vec2f(p) * cellDiag;\n}\n\nfn Point3D(p : vec2i) -> vec3f {\n  return vec3f(ArrayPoint(p), Height(p));\n}\n\nfn Slope(p : vec2i, q : vec2i) -> f32 {\n  if (p.x < 0 || p.x >= simParams.nx || p.y < 0 || p.y >= simParams.ny) { return 0.0; }\n  if (q.x < 0 || q.x >= simParams.nx || q.y < 0 || q.y >= simParams.ny) { return 0.0; }\n  if (p.x == q.x && p.y == q.y) { return 0.0; }\n\n  var d = length(ArrayPoint(q) - ArrayPoint(p));\n  return (Height(q) - Height(p)) / d;\n}\n\nfn GetFlowSteepest(p : vec2i) -> vec2i {\n  var d = vec2i();\n  var maxSlope = 0.0;\n  for (var i = 0; i < 8; i++) {\n      var ss = Slope(p + neighbors[i], p);\n      if (ss > maxSlope) {\n        maxSlope = ss;\n        d = neighbors[i];\n      }\n  }\n  return d;\n}\n\nfn Stream(p : vec2i) -> f32 {\n  if (p.x < 0 || p.x >= simParams.nx || p.y < 0 || p.y >= simParams.ny) { return 0.0; }\n  \n  return StreamAt(p);\n}\n\nfn WaterSteepest(p : vec2i) -> f32 {\n  var water = 0.0;\n  for (var i = 0; i < 8; i++) {\n      var q = p + neighbors[i];\n      var fd = GetFlowSteepest(q);\n      if ((q + fd).x == p.x && (q + fd).y == p.y) {\n        water += Stream(q);\n      }\n  }\n  return water;\n}\n\nfn Laplacian(p : vec2i) -> f32 {\n  var laplacian = 0.0;\n  var i : i32 = p.x;\n  var j : i32 = p.y;\n\n  var sqrCellDiagX = simParams.cellDiagX * simParams.cellDiagX;\n  var sqrCellDiagY = simParams.cellDiagY * simParams.cellDiagY;\n\n  if (i == 0) {\n    laplacian += (Height(p) - 2.0 * Height(vec2i(i+1, j)) + Height(vec2i(i+2, j))) / sqrCellDiagX;\n  }\n  else if (i == simParams.nx - 1) {\n    laplacian += (Height(p) - 2.0 * Height(vec2i(i-1, j)) + Height(vec2i(i-2, j))) / sqrCellDiagX;\n  }\n  else {\n    laplacian += (Height(vec2i(i+1, j)) - 2.0 * Height(vec2i(i, j)) + Height(vec2i(i-1, j))) / sqrCellDiagX;\n  }\n  \n  if (j == 0) {\n    laplacian += (Height(p) - 2.0 * Height(vec2i(i, j+1)) + Height(vec2i(i, j+2))) / sqrCellDiagY;\n  }\n  else if (j == simParams.ny - 1) {\n    laplacian += (Height(p) - 2.0 * Height(vec2i(i, j-1)) + Height(vec2i(i, j-2))) / sqrCellDiagY;\n  }\n  else {\n    laplacian += (Height(vec2i(i, j+1)) - 2.0 * Height(vec2i(i, j)) + Height(vec2i(i, j-1))) / sqrCellDiagY;\n  }\n\n  return laplacian;\n}\n\nfn Read(p : vec2i) -> vec4f {\n  if (p.x < 0 || p.x >= simParams.nx || p.y < 0 || p.y >= simParams.ny) {\n    return vec4f();\n  }\n\n  var ret = vec4f();\n  ret.x = Height(p);        // Bedrock elevation\n  ret.y = StreamAt(p);      // Stream area\n  ret.z = UpliftAt(p);      // Uplift factor\n  return ret;\n}\n\nfn Write(p : vec2i, data : vec4f) {\n  textureStore(outElevation, p, vec4f(data.x));\n  textureStore(outStream, p, vec4f(data.y));\n}\n\n// Local Editing\nfn DrawPaint(pf : vec2f, colorChannel : f32) -> f32 {\n  var PAINT_STRENGTH = customBrushParams.brushStrength;\n  var PAINT_RADIUS = customBrushParams.brushScale * 2.0; // scale up for now as brush texture is using this as mip level\n\n  var dist = distance(vec2f(customBrushParams.brushPosX, customBrushParams.brushPosY), pf);\n  if (dist <= PAINT_RADIUS) {\n    var factor = 1.0 - dist * dist / (PAINT_RADIUS * PAINT_RADIUS);\n    if (customBrushParams.erase == 1) {\n      return colorChannel - PAINT_STRENGTH * factor * factor * factor;\n    }\n    else {\n      return colorChannel + PAINT_STRENGTH * factor * factor * factor;\n    }\n  }\n\n  return colorChannel;\n}\n\nfn GetBrushAABB() -> AABB {\n  var center = vec2f(customBrushParams.brushPosX, customBrushParams.brushPosY);\n  var halfWidth = f32(textureDimensions(customBrush).x / 2);\n  var halfHeight = f32(textureDimensions(customBrush).y / 2);\n  var scale = 1 + customBrushParams.brushScale;\n\n  var lowerLeft = vec2f(center.x - halfWidth / scale, center.y - halfHeight / scale);\n  var upperRight = vec2f(center.x + halfWidth / scale, center.y + halfHeight / scale);\n  return AABB(lowerLeft, upperRight);\n}\n\nfn DrawBrush(pf : vec2f, colorChannel : f32) -> f32 {\n  var bb = GetBrushAABB();\n  var minX = bb.lowerLeft.x;\n  var minY = bb.lowerLeft.y;\n  var maxX = bb.upperRight.x;\n  var maxY = bb.upperRight.y;\n  var withinBB = minX < pf.x && pf.x < maxX &&\n                  minY < pf.y && pf.y < maxY;\n  if (withinBB) {\n    // var texCoordf = vec2f((pf.x - minX) / f32(textureDimensions(customBrush).x),\n    //                       (pf.y - minY) / f32(textureDimensions(customBrush).y));\n    var pixelIdx = vec2u(u32(pf.x - minX), u32(pf.y - minY));\n\n    var strength = customBrushParams.brushStrength * 0.1; // scale down strength for now, testing\n    if (customBrushParams.erase == 1) {\n      // use brushScale as mip level; use b channel from sampled value\n      return colorChannel - textureLoad(customBrush, pixelIdx, u32(customBrushParams.brushScale)).b * strength;\n      // color.g -= textureSampleLevel(customBrush, brushSampler, texCoordf, customBrushParams.brushScale).b / customBrushParams.brushStrength;\n    }\n    else {\n      return colorChannel + textureLoad(customBrush, pixelIdx, u32(customBrushParams.brushScale)).b * strength;\n      // color.g += textureSampleLevel(customBrush, brushSampler, texCoordf, customBrushParams.brushScale).b / customBrushParams.brushStrength;\n    }\n  }\n\n  return colorChannel;      \n}\n\n@compute @workgroup_size(8, 8, 1)\nfn main(\n  @builtin(workgroup_id) WorkGroupID : vec3<u32>,\n  @builtin(local_invocation_id) LocalInvocationID : vec3<u32>,\n  @builtin(global_invocation_id) GlobalInvocationID : vec3<u32>\n) {\n  let idX = i32(GlobalInvocationID.x);\n  let idY = i32(GlobalInvocationID.y);\n  if (idX < 0 || idY < 0) { return; }\n  if (idX >= simParams.nx || idY >= simParams.ny) { return; }\n\n  var id : i32 = ToIndex1D(idX, idY);\n  var p : vec2i = vec2i(idX, idY);\n  var data : vec4f = Read(p);\n  var cellDiag = vec2f(simParams.cellDiagX, simParams.cellDiagY);\n\n  // Border nodes are fixed to zero (elevation and drainage)\n  if (p.x == 0 || p.x == simParams.nx - 1 ||\n      p.y == 0 || p.y == simParams.ny - 1) {\n    data.x = 0.0;\n    data.y = 1.0 * length(cellDiag);\n    Write(p, data);\n    return;\n  }\n\n  // Flows accumulation at p\n  var waterIncr = WaterSteepest(p);\n\n  data.y = 1.0 * length(cellDiag);\n  data.y += waterIncr;\n\n  // Erosion at p (relative to steepest)\n  var d = GetFlowSteepest(p);\n  var receiver = Read(p + d);\n  var pSlope = abs(Slope(p + d, p));\n\n  var erosion = k * pow(data.y, p_sa) * pow(pSlope, p_sl);\n\n  var newHeight = data.x;\n  if (erosionMode == 0) {           // Stream power\n    newHeight -= dt * (erosion);\n  }\n  else if (erosionMode == 1) {      // Stream power + Hillslope erosion (Laplacian)\n    newHeight -= dt * (erosion - k_h * Laplacian(p));\n  }\n  else if (erosionMode == 2) {      // Stream power + Hillslope erosion (Laplacian) + Debris flow\n    newHeight -= dt * (erosion - k_h * Laplacian(p) - k_d * pSlope);\n  }\n\n  newHeight = max(newHeight, receiver.x);\n  newHeight += dt * uplift * data.z;\n\n  data.x = newHeight;\n  Write(p, data);\n}"}),entryPoint:"main"}}),$=g.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),ee=g.createBindGroup({label:"simulation constants",layout:J.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:$}}]}),et={label:"compute bind group descriptor 0",layout:J.getBindGroupLayout(1),entries:[{binding:1,resource:M[0].createView()},{binding:2,resource:M[1].createView()},{binding:3,resource:Z[0].createView()},{binding:4,resource:Z[1].createView()},{binding:5,resource:Q[0].createView()},{binding:6,resource:Q[1].createView()}]},er={label:"compute bind group descriptor 1",layout:J.getBindGroupLayout(1),entries:[{binding:1,resource:M[1].createView()},{binding:2,resource:M[0].createView()},{binding:3,resource:Z[1].createView()},{binding:4,resource:Z[0].createView()},{binding:5,resource:Q[1].createView()},{binding:6,resource:Q[0].createView()}]},en=g.createBindGroup(et),ei=g.createBindGroup(er),ea=[en,ei],eo=g.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),es={label:"brush bind group descriptor",layout:J.getBindGroupLayout(2),entries:[{binding:0,resource:{buffer:eo}},{binding:1,resource:i.createView()}]},eu=g.createBindGroup(es);o.createTerrainBindGroup(O,H,0,F,M[E],q),a.createBindGroup(_,H,256,F,M[E]);let ec=new R;requestAnimationFrame(function frame(){if(!r.active)return;L?function(){let e,t,r,n,i=B.resolution[0]/window.devicePixelRatio,a=B.resolution[1]/window.devicePixelRatio,o=function(e,t,r,n,i){let a=141.3716694115407/180,o=h.R3.mulScalar(e.up,Math.tan(.5*a)),s=h.R3.mulScalar(e.right,Math.tan(.5*a)*(t/r)),u=h.R3.add(h.R3.add(e.getPosition(),e.forward),h.R3.mulScalar(s,2*n/t-1));h.R3.add(u,h.R3.mulScalar(o,2*i/r-1),u);let c=h.R3.sub(u,e.getPosition());return h.R3.normalize(c)}(B,i,a,Y,N),s=h.R3.create(B.getPosition()[0],B.getPosition()[1],B.getPosition()[2]),[u,c]=(e=h.vh.create(0,1,0,0),t=h.vh.create(0,0,0,0),r=h.R3.dot(e,h.R3.sub(t,s))/h.R3.dot(e,o),n=h.R3.add(s,h.R3.mulScalar(o,r)),r<0||n[0]<-5||n[0]>5||n[2]<-5||n[2]>5?[!1,null]:[!0,n]),l=-1,f=-1;if(u){let e=h.R3.sub(h.R3.create(c[0],c[1],c[2]),h.R3.create(ec.lowerVertX,0,ec.lowerVertY)),t=h.R3.sub(h.R3.create(ec.upperVertX,0,ec.upperVertY),h.R3.create(ec.lowerVertX,0,ec.lowerVertY)),r=h.R3.div(e,t);l=Math.floor(r[0]*k),f=Math.floor(r[2]*W)}X[0]=l,X[1]=f}():(B.update(),X[0]=-1,X[1]=-1),u.begin();let e=g.createCommandEncoder();d>-1&&(0==d&&e.copyTextureToTexture({texture:C[l[c.heightfield]]},{texture:M[E]},{width:k,height:W}),et.entries[0].resource=M[0].createView(),et.entries[1].resource=M[1].createView(),er.entries[0].resource=M[1].createView(),er.entries[1].resource=M[0].createView(),1==d&&(et.entries[2].resource=n.createView(),er.entries[2].resource=n.createView()),en=g.createBindGroup(et),ei=g.createBindGroup(er),ea=[en,ei],2==d&&(console.log(i.label),es.entries[1].resource=i.createView(),eu=g.createBindGroup(es)),d=-1);{let t=e.beginComputePass();t.setPipeline(J),g.queue.writeBuffer($,0,new Float32Array([ec.nx,ec.ny,ec.lowerVertX,ec.lowerVertY,ec.upperVertX,ec.upperVertY,ec.cellDiagX,ec.cellDiagY]));let r=0,n=0;c.eraseTerrain&&(r=1),c.useCustomBrush&&(n=1),g.queue.writeBuffer(eo,0,new Float32Array([X[0],X[1],c.brushScale,c.brushStrength,i.height,i.width,r,n])),t.setBindGroup(0,ee),t.setBindGroup(1,ea[E]),t.setBindGroup(2,eu),t.dispatchWorkgroups(Math.ceil(Math.max(k,W)/8)+1,Math.ceil(Math.max(k,W)/8)+1),t.end(),E=(E+1)%2}{let t=e.beginRenderPass({colorAttachments:[{view:v.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});t.setPipeline(O),writeMVPUniformBuffer(g,H,0,o.getModelMatrix(),B,!0),function(e,t,r){e.queue.writeBuffer(t,0,new Float32Array([r.nx,r.ny,r.lowerVertX,r.lowerVertY,r.upperVertX,r.upperVertY]))}(g,q,ec),t.setBindGroup(0,o.bindGroup),t.setIndexBuffer(o.indexBuffer,"uint32"),t.setVertexBuffer(0,o.posBuffer),t.setVertexBuffer(1,o.normalBuffer),t.setVertexBuffer(2,o.uvBuffer),t.drawIndexed(o.count),t.end()}{let t=e.beginRenderPass({colorAttachments:[{view:v.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"load",storeOp:"store"}]});t.setPipeline(_),writeMVPUniformBuffer(g,H,256,a.getModelMatrix(),B,!0),t.setBindGroup(0,a.bindGroup),t.setIndexBuffer(a.indexBuffer,"uint32"),t.setVertexBuffer(0,a.posBuffer),t.setVertexBuffer(1,a.normalBuffer),t.setVertexBuffer(2,a.uvBuffer),t.drawIndexed(a.count),t.end()}g.queue.submit([e.finish()]),requestAnimationFrame(frame),u.end()})};var pages=()=>makeSample({name:"Terrain X",description:"Interactive terrain authoring and erosion simulation on WebGPU",gui:!0,stats:!0,init,filename:"src/sample/terrainX/main.ts"})},4131:function(e){e.exports={canvasContainer:"SampleLayout_canvasContainer__ZTWP5"}}},function(e){e.O(0,[746,150,774,888,179],function(){return e(e.s=8312)}),_N_E=e.O()}]);