import { ContainerType } from './Container';
import { Point } from './Point';
import { addTooltip } from './addTooltip';

export const CONTROL_POINT_CLASS = 'controlPoint';

export const clamp0to1 = (x: number) => Math.max(0, Math.min(1, x));

const STROKE = 2;
const VISIBLE_RADIUS = 8;
const CLICK_RADIUS = 14;
export const FULL_RADIUS = CLICK_RADIUS;

const makeCircle = () => {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  group.setAttribute('width', String(FULL_RADIUS * 2));
  group.setAttribute('height', String(FULL_RADIUS * 2));
  group.setAttribute(
    'viewBox',
    `-${FULL_RADIUS} -${FULL_RADIUS} ${FULL_RADIUS * 2} ${FULL_RADIUS * 2}`,
  );

  const circle = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle',
  );
  circle.setAttribute('r', String(VISIBLE_RADIUS));
  circle.setAttribute('fill', 'white');
  circle.setAttribute('stroke', 'black');
  circle.setAttribute('stroke-width', String(STROKE));
  circle.setAttribute('class', CONTROL_POINT_CLASS);

  circle.style.transition = 'opacity 0.05s ease-in-out';
  group.appendChild(circle);

  const clickTarget = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle',
  );
  clickTarget.setAttribute('r', String(CLICK_RADIUS));
  clickTarget.setAttribute('fill', 'transparent');
  clickTarget.setAttribute('stroke', 'transparent');
  clickTarget.setAttribute('style', 'cursor: move;');
  group.appendChild(clickTarget);

  return { group, circle, clickTarget };
};

export class ControlPoint {
  element: SVGGraphicsElement;
  circle: SVGCircleElement;
  tooltip: ReturnType<typeof addTooltip>;
  fadedOpacity = '0';
  protected container: ContainerType;
  protected isDragging: boolean = false;
  protected isHovered: boolean = false;
  protected pointerEntered: boolean = false;
  readonly point: Point;

  public deletable = true;
  readonly DELETE_EVENT = 'deleteme';
  readonly eventTarget = new EventTarget();
  private grabX = 0;
  private grabY = 0;

  protected toDataSpace: (x: number) => number;

  static styleElement = undefined as HTMLStyleElement | undefined;

  constructor(
    container: ContainerType,
    point: Point,
    toDataSpace: (x: number) => number,
    deleteEventCallback?: (event: CustomEvent) => void,
    isNewPointFromPointer = false,
  ) {
    const { group, circle } = makeCircle();
    this.element = group;
    this.circle = circle;
    this.point = point;
    this.container = container;
    this.toDataSpace = toDataSpace;

    this.tooltip = addTooltip(this.container.overlay);

    container.addSizeObserver(() => {
      this.positionElement();
    });

    if (deleteEventCallback) {
      this.eventTarget.addEventListener(this.DELETE_EVENT, (e: Event) => {
        deleteEventCallback(<CustomEvent>e);
      });
    }

    container.appendChild(this.element);
    this.positionElement();
    this.point.eventTarget.addEventListener('updated', () =>
      this.positionElement(),
    );

    this.setupInteraction();
    if (isNewPointFromPointer) this.startInteraction(true);
  }

  remove() {
    // send hover and dragging update events for downstream listeners
    this.pointerEntered = false;
    this.update();
    this.tooltip.remove();
    this.container.removeChild(this.element);
  }

  getIsDragging() {
    return this.isDragging;
  }

  protected setIsDragging(isDragging: boolean) {
    if (this.isDragging === isDragging) return;
    this.isDragging = isDragging;
    this.eventTarget.dispatchEvent(new Event('dragging-updated'));
  }

  getIsHovered() {
    return this.isHovered;
  }

  protected setIsHovered(isHovered: boolean) {
    if (this.isHovered === isHovered) return;

    if (isHovered) this.tooltip.show();
    else this.tooltip.hide();

    this.isHovered = isHovered;
    this.eventTarget.dispatchEvent(new Event('hovered-updated'));
  }

  getSvgPosition() {
    const { x, y } = this.point;
    return this.container.normalizedToSvg(x, y);
  }

  // Pass xySvg to avoid recomputing
  updateTooltip(xySvg: [number, number] | undefined = undefined) {
    const { x } = this.point;
    const dataValue = this.toDataSpace(x);
    const [xSvg, ySvg] = xySvg ?? this.getSvgPosition();
    this.tooltip.update(dataValue.toPrecision(4), xSvg, ySvg);
  }

  positionElement() {
    const [xSvg, ySvg] = this.getSvgPosition();
    this.element.setAttribute('x', String(xSvg - FULL_RADIUS));
    this.element.setAttribute('y', String(ySvg - FULL_RADIUS));
    this.updateTooltip([xSvg, ySvg]);

    if (
      this.point.x > 1.001 ||
      this.point.x < -0.001 ||
      this.point.y > 1.001 ||
      this.point.y < -0.001
    ) {
      this.circle.style.opacity = this.fadedOpacity;
    } else {
      this.circle.style.opacity = '1';
    }
  }

  movePoint(e: PointerEvent) {
    const [x, y] = this.container.domToNormalized(e.clientX, e.clientY);
    this.point.setPosition(
      clamp0to1(x + this.grabX),
      clamp0to1(y + this.grabY),
    );
  }

  update() {
    this.circle.setAttribute('stroke-width', String(STROKE));
    if (this.pointerEntered) {
      this.circle.setAttribute('stroke-width', String(STROKE + 1));
      this.updateTooltip();

      this.setIsHovered(true);
    }
    if (this.isDragging) {
      this.circle.setAttribute('stroke-width', String(STROKE * 2));
    }
    if (!this.isDragging && !this.pointerEntered) {
      this.setIsHovered(false);
    }
  }

  startInteraction(forceDragging = false) {
    this.setIsDragging(forceDragging);
    if (!this.isDragging && this.deletable) {
      this.circle.setAttribute('stroke', 'red'); // deleteable
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDragging) {
        this.circle.setAttribute('stroke', 'black');
      }
      this.setIsDragging(true);
      this.movePoint(e);
    };
    document.addEventListener('pointermove', onPointerMove);

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);

      if (!this.isDragging) {
        const delEvent = new CustomEvent(this.DELETE_EVENT, { detail: this });
        this.eventTarget.dispatchEvent(delEvent);
      }
      this.setIsDragging(false);
      this.update();
    };

    document.addEventListener('pointerup', onPointerUp);
  }

  setupInteraction() {
    this.element.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      this.circle.setAttribute('stroke-width', String(STROKE * 2));
      const [x, y] = this.container.domToNormalized(
        event.clientX,
        event.clientY,
      );
      this.grabX = this.point.x - x;
      this.grabY = this.point.y - y;
      this.startInteraction();
    });
    this.element.addEventListener('pointerenter', () => {
      this.pointerEntered = true;
      this.update();
    });
    this.element.addEventListener('pointerleave', () => {
      this.pointerEntered = false;
      this.update();
    });
  }

  setColor(color: string) {
    this.circle.setAttribute('fill', color);
  }

  setVisibility(visible: boolean) {
    this.element.style.display = visible ? 'block' : 'none';
  }
}
