import { ContainerType } from './Container';
import { ControlPoint, clamp0to1 } from './ControlPoint';
import { Point } from './Point';
import { Points } from './Points';

// Adds new Points to model and create view of the points
export class PointsController {
  container: ContainerType;
  points: Points;
  readonly eventTarget = new EventTarget();
  private toDataSpace: (x: number) => number;
  private hovered = false;
  private onPointsUpdated: () => void;
  private controlPoints: ControlPoint[] = [];
  private isNewPointFromPointer = false;
  private rangeViewOnly = false;

  constructor(
    container: ContainerType,
    points: Points,
    toDataSpace: (x: number) => number,
  ) {
    this.container = container;
    this.points = points;
    this.toDataSpace = toDataSpace;

    // update model
    const { root } = container;
    root.addEventListener('pointerdown', (e) => this.onPointerDown(e));

    // react to model
    this.onPointsUpdated = () => this.updatePoints();
    this.points.eventTarget.addEventListener('updated', this.onPointsUpdated);

    this.updatePoints();
  }

  remove() {
    this.points.eventTarget.removeEventListener(
      'updated',
      this.onPointsUpdated,
    );
  }

  onPointerDown(event: PointerEvent) {
    if (this.rangeViewOnly) return;
    const [x, y] = this.container
      .domToNormalized(event.clientX, event.clientY)
      .map(clamp0to1);
    this.isNewPointFromPointer = true;
    this.points.addPoint(x, y);
    this.isNewPointFromPointer = false;
  }

  onControlPointDelete(event: CustomEvent) {
    this.points.removePoint(event.detail.point);
  }

  updatePoints() {
    // delete removed ControlPoints
    const orphans = this.controlPoints.filter(
      (cp) => !this.points.points.find((point) => point === cp.point),
    );
    orphans.forEach((cp) => cp.remove());
    this.controlPoints = this.controlPoints.filter(
      (cp) => !orphans.includes(cp),
    );

    // add new ControlPoints
    const isPointInControlPoints = (point: Point) =>
      this.controlPoints.find((cp) => cp.point === point);

    const addNewControlPoint = (point: Point) => {
      const cp = new ControlPoint(
        this.container,
        point,
        this.toDataSpace,
        (e) => this.onControlPointDelete(e),
        this.isNewPointFromPointer,
      );
      cp.eventTarget.addEventListener('hovered-updated', () =>
        this.updateHovered(cp.getIsHovered()),
      );
      this.controlPoints.push(cp);
    };

    this.points.points
      .filter((pointModel) => !isPointInControlPoints(pointModel))
      .forEach(addNewControlPoint);

    this.updateVisibility();
  }

  updateHovered(hovered: boolean) {
    if (hovered !== this.hovered) {
      this.hovered = hovered;
      this.eventTarget.dispatchEvent(
        new CustomEvent('hovered-updated', {
          detail: { hovered: this.hovered },
        }),
      );
    }
  }

  updateVisibility() {
    this.controlPoints.forEach((cp) => cp.setVisibility(!this.rangeViewOnly));
  }

  setRangeViewOnly(rangeViewOnly: boolean) {
    this.rangeViewOnly = rangeViewOnly;
    this.updateVisibility();
  }
}
