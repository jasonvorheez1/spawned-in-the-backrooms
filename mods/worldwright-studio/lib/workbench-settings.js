// Shared pure settings; behavior, pointer handling and rendering keep their own lifetimes.
export const PATH={version:1,coordinateEpsilon:1e-10,defaultDuration:3,maxDuration:120,maxImportBytes:600000,maxPoints:128,samplesPerSegment:12,maxCoordinate:99999,defaultTension:.5,append:[0,0,-2],pointRadius:.09,traceRadius:.1,traceLength:.34,defaultPoints:[[0,0,0],[0,1,-3],[2,2,-6]]};

export const TUNE={touchPickPixels:12,mousePickPixels:4,precision:.1,rotationPerPixel:.01,scalePerPixel:.005,moveSnap:.1,rotateSnap:15,scaleSnap:.1,minScale:.001,maxValue:99999,axisEpsilon:.015,brushStep:2,brushMin:1,brushMax:100};
