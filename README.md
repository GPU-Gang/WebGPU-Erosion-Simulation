# Interactive Erosion Simulation in WebGPU
Authors: [Utkarsh Dwivedi](https://linkedin.com/in/udwivedi/), [Saksham Nagpal](https://www.linkedin.com/in/nagpalsaksham/), [Linda Zhu](https://www.linkedin.com/in/lindadaism/)

**TerrainX** is an implementation of the paper [Large-scale terrain authoring through interactive erosion simulation](https://hal.science/hal-04049125) published on 28th July 2023 that aims to combine interactive large-scale terrain authoring with geomorphologically accurate erosion simulation.

## **[Click here for a Live Demo!](https://gpu-gang.github.io/WebGPU-Erosion-Simulation/)**

![](public/assets/captures/raymarch2.gif)

## Parallelized Stream Power Erosion
To address the incremental and interactive resolution of the stream power equation, the authors address the most computationally expensive aspect of solving this equation - the drainage area. The authors propose a parallel approximation of the drainage area that results in a fast convergence rate for the stream power equation. We started off by writing a **compute shader** that simulates this approximated version of the equation, and our result was as follows:  
![](public/assets/captures/erosion_2d.gif)

## Raymarched Terrain
To visualise the 3d terrain based on the computed height map, we follow the author's approach of employing sphere tracing, and the results looked like this:  
| <img src="public/assets/captures/raymarch1.gif" width=500> | <img src="public/assets/captures/raymarch3.gif" width=500> | 
|:--:|:--:|
| *Normals as color* | *Lambertian Shading* |

## Interactive Authoring
One of the main goals of the paper is to bridge the gap between interactive terrain authoring with geomorpholigcally accurate erosion simulation. For this, they present several tools, of which we formulated a subset:

### 1. Terrain Painting Tool
Users can use `Ctrl + Mouse-Click` and drag the mouse to uplift the terrain by the required amount driven by the `brushStrength` parameter within a certain radius driven off of the `brushRadius parameter`.  
<img src="public/assets/captures/ui_paint.png" width=300>  
![](public/assets/captures/painting.gif)

### 2. Terrain Erasing Tool
Using the same controls as the painting tool, users can toggle to erase the terrain instead by checking the `eraseTerrain` option on the GUI.  
<img src="public/assets/captures/ui_erase.png" width=300>  
![](public/assets/captures/erase.gif)

### 4. Texture-based Brush Tool
Checkcing the `customBrush` box will enable users to paint and erase using a texture-based brush. The `brushScale` then represents the different mipmap levels of the original texture, resulting in a smaller brush size with a higher `brushScale`.


<img src="public/assets/captures/ui_brush.png" width=300>

![](public/assets/captures/brush.gif)

## Real-World Data Integration
After establishing a usable model based on the paper, we wanted to see its applicability using some real world data. We used [Earth Explorer](https://earthexplorer.usgs.gov/) to get the height field for a certain part of the world. [This](https://www.youtube.com/watch?v=kEgijZUKMGc) video was a helpful walkthrough that showed us how we could use Earth Explorer to get the required height maps.

* ### Proof of Concept
First, we select a section of the terrain on Earth Explorer whose data we want to retrieve. We selected a section of the Himalayas:  
![](public/assets/captures/realworld_poc_1.png)  

Next, Earth Explorer shows the sections for which data is available and chops it up into individual textures of **1201X1201 pixels**. We selected the one shown below:  
![](public/assets/captures/realworld_poc_2.png)  
![](public/assets/captures/realworld_poc_3.png)  

Finally, we use this texture in our application, and we can see a visaulization of the Himalayas based on the Height Map used and running at a solid 80+ FPS:  
<img src="public/assets/captures/realword_poc_terrain1.png" width=400> 
<img src="public/assets/captures/realword_poc_terrain2.png" width=400> 

## Building
`webgpu-erosion-simulation` is built with [Typescript](https://www.typescriptlang.org/)
and compiled using [Next.js](https://nextjs.org/). Building the project
requires an installation of [Node.js](https://nodejs.org/en/).

- Install dependencies: `npm install`.
- For development, start the dev server which will watch and recompile
  sources: `npm start`. You can navigate to http://localhost:3000 to view the project.
- To compile the project: `npm run build`.

## Performance Analysis

### 1. Finding a good workgroup size

*Performance data captured on Windows 11 Home, AMD Ryzen 7 5800H @ 3.2GHz 16 GB, Nvidia GeForce RTX 3060 Laptop GPU 6 GB, running on Google Chrome*

For analysing the impact of workgroup size on performance, a 2250x2250 texture was used with varying workgroup sizes.

| FPS vs workgroup size |
|:-:|
|![](img/opt5.png)|

8x8 is the optimal workgroup size, as there are no performance gains after that. This is the workgroup size used for the rest of the analysis.

### 2. Steepest flow recalculation vs buffer

*Performance data captured on Windows 11 Home, AMD Ryzen 7 5800H @ 3.2GHz 16 GB, Nvidia GeForce RTX 3060 Laptop GPU 6 GB, running on Google Chrome*

The steepest flow for the erosion is calculated not once, but twice, for each pixel. This calculation involves sampling a the neighbours of the current pixel in a `25x25` matrix area. This becomes costly with increasing texture resolutions.

Calculating this steepest flow only once, and then storing it in a buffer for reuse later, boosts performance significantly. This performance boost is more apparent with higher resolution textures, as with lower resolution textures the **total** number of neighbourhood samples across all pixels during a frame are not very high.

| FPS: Steepest flow calculation optimisation using storage buffer |
|:-:|
|![](img/opt1.png)|

This does have an impact on memory with greater texture sizes (due to the additional steepest flow buffer), but this is acceptable for the performance gains.

| Memory Usage (MBs): Steepest flow calculation optimisation using storage buffer |
|:-:|
|![](img/opt4.png)|

### 3. `textureSample` vs `textureSampleLevel`

*Performance data captured on Windows 11 Home, AMD Ryzen 7 5800H @ 3.2GHz 16 GB, Nvidia GeForce RTX 3060 Laptop GPU 6 GB, running on Google Chrome*

Our first iteration of the terrain rendering using raymarching used `textureSample`.

`textureSample` requires texture sampling to happen in uniform control flow. This means that the terrain raymarching could not use bounding box optimisations to only sample the heightfield when the ray hit the bounding box of the terrain. The texture needed to be sampled for every ray (every pixel!) and every frame. This also meant that many calculations that should only happen when the ray actually hit the terrain, were happening at all times. This slowed down performance significantly!

`textureSampleLevel` is hardware accelerated, and does not have the same uniform control flow requirement as `textureSample`. After making these changes we noticed significant performance boosts.

| FPS: Axis-Aligned Bounding Box optimisations |
|:-:|
|![](img/opt2.png)|

### Both optimizations combined

While both the steepest flow buffer and bounding box optimisations improve performance, their real benefit shows when both are combined.

| FPS: both optimisations |
|:-:|
|![](img/opt3.png)|

We're able to get ~40 fps on the web even with 4.5k size textures when both these optimisations are enabled!

## Credits

- 3d-view-controls npm package
