@group(0) @binding(0) var mySampler : sampler;
@group(0) @binding(1) var myTexture : texture_2d<f32>;

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
  output.Position = vs_pos;
  output.fs_UV = vs_uv;
  return output;
}

@fragment
fn frag_main(@location(0) fs_UV : vec2<f32>) -> @location(0) vec4<f32> {
  return textureSample(myTexture, mySampler, fs_UV);
}