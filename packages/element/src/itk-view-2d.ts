import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';
import { createView2d, View2dActor } from '@itk-viewer/vtkjs/view-2d.js';

@customElement('itk-view-2d')
export class ItkView2d extends LitElement {
  actor: View2dActor = createView2d();

  constructor() {
    super();
  }

  getActor(): View2dActor {
    return this.actor;
  }

  setContainer(container: Element | undefined) {
    if (container instanceof HTMLElement) {
      this.actor.send({ type: 'setContainer', container });
    }
  }

  render() {
    return html`
      <h1>View 2D</h1>
      <div class="container" ${ref(this.setContainer)}></div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
    }

    .container {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-view-2d': ItkView2d;
  }
}
