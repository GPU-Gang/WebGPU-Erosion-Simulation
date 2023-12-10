class TerrainParams
{
    nx: number = 2500;
    ny: number = 2500;
    lowerVertX: number = -5;
    lowerVertY: number = -5;
    upperVertX: number = 5;
    upperVertY: number = 5;
    cellDiagX: number = 1176.47;//0.0392156863;
    cellDiagY: number = 1176.47;//0.0392156863;
    heightRangeMin: number = 0;
    heightRangeMax: number = 1;
    k: number = 1.0;    // lipschitz constant
    inverseCellDiagX: number = 0.000850000425;//25.5;
    inverseCellDiagY: number = 0.000850000425;//25.5;
}

export default TerrainParams;