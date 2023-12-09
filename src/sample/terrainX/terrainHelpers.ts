import { Vec2, vec2 } from "wgpu-matrix";
import TerrainParams from "./terrainParams";

function ToIndex1D(i: number, j: number, terrainParams: TerrainParams) : number
{
  return i + terrainParams.nx * j;
}

function Gradient(i: number, j: number, arr: Float32Array, terrainParams: TerrainParams): Vec2
{
  var n: Vec2 = vec2.create(0,0);

  // Gradient along x axis
  if (i == 0)
  {
    n[0] = (arr[ToIndex1D(i + 1, j, terrainParams)] - arr[ToIndex1D(i, j, terrainParams)]) * terrainParams.inverseCellDiagX;
  }
  else if (i == terrainParams.nx - 1)
  {
    n[0] = (arr[ToIndex1D(i, j, terrainParams)] - arr[ToIndex1D(i - 1, j, terrainParams)]) * terrainParams.inverseCellDiagX;
  }
  else
  {
    n[0] = (arr[ToIndex1D(i + 1, j, terrainParams)] - arr[ToIndex1D(i - 1, j, terrainParams)]) * 0.5 * terrainParams.inverseCellDiagX;
  }

  // Gradient along y axis
  if (j == 0)
  {
    n[1] = (arr[ToIndex1D(i, j + 1, terrainParams)] - arr[ToIndex1D(i, j, terrainParams)]) * terrainParams.inverseCellDiagY;
  }
  else if (j == terrainParams.ny - 1)
  {
    n[1] = (arr[ToIndex1D(i, j, terrainParams)] - arr[ToIndex1D(i, j - 1, terrainParams)]) * terrainParams.inverseCellDiagY;
  }
  else
  {
    n[1] = (arr[ToIndex1D(i, j + 1, terrainParams)] - arr[ToIndex1D(i, j - 1, terrainParams)]) * 0.5 * terrainParams.inverseCellDiagY;
  }

  return n;
}

function Norm(n: Vec2): number
{
  return vec2.length(n);
}

export default {Norm, Gradient};