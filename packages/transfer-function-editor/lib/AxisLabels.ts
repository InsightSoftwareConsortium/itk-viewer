import { ContainerType } from './Container';
import { DataRange } from './DataRange';
import { styleTooltip, styleLabelText, FONT_SIZE } from './addTooltip';
import { createOrGates } from './utils';

// pixels dom space
const HISTOGRAM_Y_OFFSET = -2;
const RANGE_VIEW_ONLY_Y_OFFSET = -22;
const BORDER_STROKE = 21;

const styleAxisLabel = (align: 'Left' | 'Right', label: HTMLElement) => {
  styleLabelText(label);
  label.style.backgroundColor = 'initial';
  label.style.borderStyle = 'initial';
  label.style.borderColor = 'initial';
  label.style.borderWidth = 'initial';
  label.style[`border${align}`] = '.15rem solid black';
  label.style.boxShadow = 'initial';
  label.style.opacity = '1';
};

export const AxisLabels = (container: ContainerType, dataRange: DataRange) => {
  const { appendChild, addSizeObserver, paddedBorder } = container;
  let rangeViewOnly = false;

  const createLabel = () => {
    const foreignObject = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'foreignObject',
    );
    foreignObject.setAttribute('width', '100%');
    foreignObject.setAttribute('height', '100%');
    foreignObject.setAttribute('pointer-events', 'none');

    const label = document.createElementNS(
      'http://www.w3.org/1999/xhtml',
      'div',
    );
    styleTooltip(label);
    foreignObject.appendChild(label);
    appendChild(foreignObject, 'overlay');
    return label;
  };
  const low = createLabel();
  const high = createLabel();

  const invisibleHoverBorder = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'rect',
  );
  appendChild(invisibleHoverBorder);
  invisibleHoverBorder.setAttribute('fill', 'none');
  invisibleHoverBorder.setAttribute('stroke', 'none');
  invisibleHoverBorder.setAttribute('stroke-width', String(BORDER_STROKE));
  invisibleHoverBorder.setAttribute('pointer-events', 'stroke');

  const getSvgPosition = (xNormalized: number) => {
    const [xSvg, bottom] = container.normalizedToSvg(xNormalized, 0);
    const yOffset = rangeViewOnly
      ? RANGE_VIEW_ONLY_Y_OFFSET
      : HISTOGRAM_Y_OFFSET;
    const ySvg = bottom + yOffset + FONT_SIZE;
    return [xSvg, ySvg];
  };

  const updateLabel = (
    label: HTMLElement,
    xNormalized: number,
    align: 'start' | 'end',
  ) => {
    const value = dataRange.toDataSpace(xNormalized);
    label.textContent = value === 0 ? '0' : `${value.toPrecision(4)}`;
    const [x, y] = getSvgPosition(xNormalized);

    const box = label.getBoundingClientRect();
    const xOffset = align === 'start' ? -0.5 : -box.width + 0.5;
    const yOffset = box.height / 2;
    label.style.transform = `translate(${x + xOffset}px,${y - yOffset}px)`;

    // match padded border attributes to invisible hover border
    ['x', 'y', 'width', 'height'].forEach((attr) => {
      const value = paddedBorder.getAttribute(attr);
      value !== null && invisibleHoverBorder.setAttribute(attr, value);
    });
  };

  const updateLabels = () => {
    const [lowX, highX] = container.getViewBox();
    updateLabel(low, lowX, 'start');
    updateLabel(high, highX, 'end');
  };

  updateLabels();
  addSizeObserver(updateLabels);
  dataRange.eventTarget.addEventListener('updated', updateLabels);

  const computeOpacity = (visibility: boolean) => {
    if (rangeViewOnly) return '1';
    return visibility ? '1' : '0';
  };

  const setVisibility = (visibility: boolean) => {
    const opacity = computeOpacity(visibility);
    low.style.opacity = opacity;
    high.style.opacity = opacity;
  };

  const createSetVisibilityGate = createOrGates(setVisibility);

  const setVisFromBorder = createSetVisibilityGate();
  invisibleHoverBorder.addEventListener('pointerenter', () => {
    setVisFromBorder(true);
  });
  invisibleHoverBorder.addEventListener('pointerleave', () => {
    setVisFromBorder(false);
  });

  const setRangeViewOnly = (rangeOnly: boolean) => {
    rangeViewOnly = rangeOnly;
    if (rangeOnly) {
      styleAxisLabel('Left', low);
      styleAxisLabel('Right', high);
    } else {
      styleTooltip(low);
      styleTooltip(high);
    }

    setVisibility(rangeViewOnly);
    updateLabels();
  };

  return { createSetVisibilityGate, setRangeViewOnly };
};

export type AxisLabels = ReturnType<typeof AxisLabels>;
