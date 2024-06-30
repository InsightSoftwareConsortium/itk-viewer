import { Point } from './Point';
import { Points } from './Points';
import { ControlPoint, FULL_RADIUS } from './ControlPoint';
import { ContainerType } from './Container';
import { ColorTransferFunction, rgbaToHexa } from './PiecewiseUtils';
import { Line } from './Line';
import { Range } from './utils';

const Y_OFFSET = -2.75; // pixels dom space

class ColorControlPoint extends ControlPoint {
  fadedOpacity = '1';
  getSvgPosition() {
    const { x } = this.point;
    const [xSvg, bottom] = this.container.normalizedToSvg(x, 0);
    const ySvg = bottom + Y_OFFSET + FULL_RADIUS;
    return [xSvg, ySvg];
  }

  movePoint(e: PointerEvent) {
    super.movePoint(e);
    this.point.setPosition(this.point.x, 0);
  }
}

class ColorLine extends Line {
  constructor(container: ContainerType, points: Points) {
    super(container, points);
    this.element.removeAttribute('clip-path');
    this.clickabeElement.removeAttribute('clip-path');
  }

  computeStringPoints() {
    return this.points.points
      .map(({ x, y }) => [x, y])
      .map(([x, y]) => this.container.normalizedToSvg(x, y))
      .map(([x, y]) => `${x},${y + Y_OFFSET + FULL_RADIUS}`)
      .join(' ');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  applyOffset(movementX: number, _: number) {
    this.points.points.forEach((point) => {
      point.setPosition(point.x + movementX, point.y);
    });
  }
}

export const ColorRange = () => {
  const points = new Points();
  points.addPoints([
    [0, 0],
    [1, 0],
  ]);

  const getPoints = () => points.points.sort((p1, p2) => p1.x - p2.x);
  const getColorRange = () => getPoints().map((p) => p.x);
  const eventTarget = new EventTarget();
  const dispachUpdated = () =>
    eventTarget.dispatchEvent(
      new CustomEvent('updated', { detail: getColorRange() }),
    );
  let batchUpdated = false;
  const setupPoint = (point: Point) => {
    point.eventTarget.addEventListener('updated', () => {
      if (!batchUpdated) dispachUpdated();
    });
  };
  points.points.forEach(setupPoint);

  return {
    getPoints,
    getColorRange,
    setColorRange: (normalized: Range) => {
      // Wait for all points to be updated before dispatching
      // Keeps update of first point from triggering update of second point in downstream app
      batchUpdated = true;
      getPoints().forEach((p, i) => {
        p.x = normalized[i];
      });
      batchUpdated = false;
      dispachUpdated();
    },
    eventTarget,
    points,
  };
};

export type ColorRangeType = ReturnType<typeof ColorRange>;

export const ColorRangeController = (
  container: ContainerType,
  colorRange: ColorRangeType,
  toDataSpace: (x: number) => number,
) => {
  const line = new ColorLine(container, colorRange.points);
  const points = colorRange.getPoints().map((p) => {
    const cp = new ColorControlPoint(container, p, toDataSpace);
    cp.deletable = false;
    return cp;
  });

  let ctf: ColorTransferFunction;

  const updatePointColors = () => {
    if (!ctf) return;
    const dataRange = ctf.getMappingRange();
    const low = [] as Array<number>;
    ctf.getColor(dataRange[0], low);
    const high = [] as Array<number>;
    ctf.getColor(dataRange[1], high);
    const sorted = points.sort((p1, p2) => p1.point.x - p2.point.x);
    sorted[0].setColor(rgbaToHexa(low));
    sorted[1].setColor(rgbaToHexa(high));
  };

  const setColorTransferFunction = (
    colorTransferFunction: ColorTransferFunction,
  ) => {
    ctf = colorTransferFunction;
    updatePointColors();
  };

  colorRange.eventTarget.addEventListener('updated', () => {
    updatePointColors();
  });

  const eventTarget = new EventTarget();
  let hovered = false;

  const updateHovered = (isHovered: boolean) => {
    if (isHovered !== hovered) {
      hovered = isHovered;
      eventTarget.dispatchEvent(
        new CustomEvent('hovered-updated', {
          detail: { hovered },
        }),
      );
    }
  };
  [...points].forEach((cp) =>
    cp.eventTarget.addEventListener('hovered-updated', () =>
      updateHovered(cp.getIsHovered()),
    ),
  );

  return {
    points,
    line,
    setColorTransferFunction,
    eventTarget,
  };
};

export type ColorRangeControllerType = ReturnType<typeof ColorRangeController>;
