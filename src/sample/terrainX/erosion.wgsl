//@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var inputTex : texture_2d<f32>;
@group(0) @binding(2) var outputTex : texture_storage_2d<rgba8unorm, write>;


@compute @workgroup_size(32, 1, 1)
fn main(
  @builtin(workgroup_id) WorkGroupID : vec3<u32>,
  @builtin(local_invocation_id) LocalInvocationID : vec3<u32>,
  @builtin(global_invocation_id) GlobalInvocationID : vec3<u32>
) {  
  let baseIndex = vec2<i32>(WorkGroupID.xy * vec2(128, 4) +
                            LocalInvocationID.xy * vec2(4, 1));

let globalPosition : vec2<u32> = vec2<u32>(u32(GlobalInvocationID.x), u32(GlobalInvocationID.y));

// Get the size of the input texture
    let texSize : vec2<u32> = textureDimensions(inputTex);

// Check if the current position is within the bounds of the texture
if all(globalPosition < texSize) {
    // Sample the input texture at the current position
    //GPT:
    //let color : vec4<f32> = textureSample(inputTexture, inputSampler, globalPosition);
    
    //From: https://www.reddit.com/r/wgpu/comments/x5z4tb/writing_to_a_texture_from_a_compute_shader/
    var color = textureLoad(inputTex, globalPosition, 0);

    // Write the sampled color to the output texture at the same position
    //GPT:
    //textureWrite(color, outputTexture, globalPosition);
    
    //From imageBlur sample and also the reddit link above
    textureStore(outputTex, globalPosition, color);
    }
}