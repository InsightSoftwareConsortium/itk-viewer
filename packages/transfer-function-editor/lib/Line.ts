import { ContainerType } from './Container';
import { Points, pointsToExtendedPoints } from './Points';

const createLine = () => {
  const line = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'polyline',
  );
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', 'black');
  line.setAttribute('stroke-width', '2');
  line.setAttribute('style', 'cursor: move;');
  line.setAttribute('clip-path', 'url(#border-clip)');
  return line;
};

export class Line {
  protected readonly points: Points;
  protected container: ContainerType;
  private onPointsUpdated: () => void;
  element: SVGPolylineElement;
  clickableElement: SVGPolylineElement;
  private dragging = false;
  private pointerEntered = false;

  constructor(container: ContainerType, points: Points) {
    this.container = container;
    this.points = points;

    this.element = createLine();
    this.element.setAttribute('pointer-events', 'none');
    this.container.appendChild(this.element);
    this.clickableElement = createLine();
    this.clickableElement.setAttribute('stroke-width', '8');
    this.clickableElement.setAttribute('stroke', 'none');
    this.clickableElement.setAttribute('pointer-events', 'stroke');
    this.container.appendChild(this.clickableElement);

    this.onPointsUpdated = () => this.update();
    this.points.eventTarget.addEventListener('updated', this.onPointsUpdated);

    this.container.addSizeObserver(() => {
      this.update();
    });
    this.update();

    this.setupInteraction();
  }

  remove() {
    this.points.eventTarget.removeEventListener(
      'updated',
      this.onPointsUpdated,
    );
  }

  update() {
    if (this.pointerEntered) {
      this.element.setAttribute('stroke-width', '4');
    }
    if (this.dragging) {
      this.element.setAttribute('stroke-width', '5');
    }
    if (!this.pointerEntered && !this.dragging) {
      this.element.setAttribute('stroke-width', '2');
    }
    if (this.points.points.length === 0) {
      this.element.setAttribute('points', '');
      this.clickableElement.setAttribute('points', '');
      return;
    }
    const stringPoints = this.computeStringPoints();

    this.element.setAttribute('points', stringPoints);
    this.clickableElement.setAttribute('points', stringPoints);
  }

  computeStringPoints() {
    return pointsToExtendedPoints(this.points.points)
      .map(([x, y]) => this.container.normalizedToSvg(x, y))
      .map(([x, y]) => `${x},${y}`)
      .join(' ');
  }

  drag(e: PointerEvent) {
    const [originX, originY] = this.container.domToNormalized(0, 0);
    const [x, y] = this.container.domToNormalized(e.movementX, e.movementY);
    const movementX = x - originX;
    const movementY = y - originY;
    this.applyOffset(movementX, movementY);
  }

  applyOffset(movementX: number, movementY: number) {
    const inBoundsPoints = this.points.points.filter((point) => {
      const { x, y } = point;
      return x >= 0 && x <= 1 && y >= 0 && y <= 1;
    });

    const newlyOutOfBoundPointsX = inBoundsPoints.filter((point) => {
      const x = point.x + movementX;
      return x < 0 || x > 1;
    });
    let clampedMovementX = movementX;
    if (newlyOutOfBoundPointsX.length === inBoundsPoints.length) {
      const outOfBoundPoint = inBoundsPoints[0];
      if (outOfBoundPoint.x + movementX < 0) {
        clampedMovementX = -outOfBoundPoint.x;
      } else {
        clampedMovementX = 1 - outOfBoundPoint.x;
      }
    }

    const newlyOutOfBoundPointsY = inBoundsPoints.filter((point) => {
      const y = point.y + movementY;
      return y < 0 || y > 1;
    });
    let clampedMovementY = movementY;
    if (newlyOutOfBoundPointsY.length === inBoundsPoints.length) {
      const outOfBoundPoint = inBoundsPoints[0];
      if (outOfBoundPoint.y + movementY < 0) {
        clampedMovementY = -outOfBoundPoint.y;
      } else {
        clampedMovementY = 1 - outOfBoundPoint.y;
      }
    }

    this.points.points.forEach((point) => {
      point.setPosition(point.x + clampedMovementX, point.y + clampedMovementY);
    });
  }

  startInteraction() {
    this.element.setAttribute('stroke-width', '5');
    const onPointerMove = (e: PointerEvent) => {
      this.dragging = true;
      this.drag(e);
    };
    document.addEventListener('pointermove', onPointerMove);

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);

      this.dragging = false;
      this.update();
    };

    document.addEventListener('pointerup', onPointerUp);
  }

  setupInteraction() {
    this.clickableElement.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      this.startInteraction();
    });
    this.clickableElement.addEventListener('pointerenter', () => {
      this.pointerEntered = true;
      this.update();
    });
    this.clickableElement.addEventListener('pointerleave', () => {
      this.pointerEntered = false;
      this.update();
    });
  }

  setVisibility(visible: boolean) {
    this.element.style.display = visible ? 'block' : 'none';
    this.clickableElement.style.display = visible ? 'block' : 'none';
  }
}
