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
  clickabeElement: SVGPolylineElement;
  private dragging = false;
  private pointerEntered = false;

  constructor(container: ContainerType, points: Points) {
    this.container = container;
    this.points = points;

    this.element = createLine();
    this.element.setAttribute('pointer-events', 'none');
    this.container.appendChild(this.element);
    this.clickabeElement = createLine();
    this.clickabeElement.setAttribute('stroke-width', '8');
    this.clickabeElement.setAttribute('stroke', 'none');
    this.clickabeElement.setAttribute('pointer-events', 'stroke');
    this.container.appendChild(this.clickabeElement);

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
      this.clickabeElement.setAttribute('points', '');
      return;
    }
    const stringPoints = this.computeStringPoints();

    this.element.setAttribute('points', stringPoints);
    this.clickabeElement.setAttribute('points', stringPoints);
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
    this.points.points.forEach((point) => {
      point.setPosition(point.x + movementX, point.y + movementY);
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
    this.clickabeElement.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      this.startInteraction();
    });
    this.clickabeElement.addEventListener('pointerenter', () => {
      this.pointerEntered = true;
      this.update();
    });
    this.clickabeElement.addEventListener('pointerleave', () => {
      this.pointerEntered = false;
      this.update();
    });
  }

  setVisibility(visible: boolean) {
    this.element.style.display = visible ? 'block' : 'none';
    this.clickabeElement.style.display = visible ? 'block' : 'none';
  }
}
