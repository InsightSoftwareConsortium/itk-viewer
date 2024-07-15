export class ColorTransferFunction {
  lowColor = [0, 0, 0, 1];
  highColor = [1, 1, 1, 1];
  mappingRange = [0, 10] as [number, number];

  getMappingRange = () => {
    return this.mappingRange;
  };

  getUint8Table = () => new Uint8Array([0, 0, 0, 255, 0, 0, 0, 255]);

  getSize = () => 2;

  getColor = (intensity: number, rgbaOut: Array<number>) => {
    const midway =
      (this.mappingRange[1] - this.mappingRange[0]) / 2 + this.mappingRange[0];
    if (intensity < midway) rgbaOut.splice(0, rgbaOut.length, ...this.lowColor);
    else rgbaOut.splice(0, rgbaOut.length, ...this.highColor);
  };
}
