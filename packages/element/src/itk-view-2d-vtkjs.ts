import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';
import { ContextConsumer } from '@lit/context';

import {
  createView2d,
  View2dVtkjsActor,
  createView2dVtkjs,
} from '@itk-viewer/vtkjs/view-2d-vtkjs.js';
import { type Viewer, viewerContext } from './viewer-context.js';

@customElement('itk-view-2d-vtkjs')
export class ItkView2dVtkjs extends LitElement {
  actorId: string = 'view2d';
  actor: View2dVtkjsActor = createView2d(this.actorId);
  container: HTMLElement | undefined;

  // @ts-expect-error viewerContext unused
  private viewerContext = new ContextConsumer(this, {
    context: viewerContext,
    subscribe: true,
    callback: (viewer: Viewer) => {
      this.setViewer(viewer);
    },
  });

  constructor() {
    super();
  }

  getActor(): View2dVtkjsActor {
    return this.actor;
  }

  setActor(actor: View2dVtkjsActor) {
    this.actor = actor;
    this.dispatchActor();
  }

  setViewer(system: Viewer) {
    this.actorId = system.getSnapshot().context.nextId;
    system.send({
      type: 'createViewport',
      logic: createView2dVtkjs(),
    });
    const actor = system.getSnapshot().children[
      this.actorId
    ] as View2dVtkjsActor;
    this.setActor(actor);
    this.sendContainer();
  }

  protected dispatchActor() {
    const actor = this.actor.getSnapshot().children.view2d;
    const event = new CustomEvent('actorCreated', {
      bubbles: true,
      composed: true,
      detail: { actor },
    });

    this.dispatchEvent(event);
  }

  protected sendContainer() {
    this.actor.send({ type: 'setContainer', container: this.container });
  }

  protected onContainer(container: Element | undefined) {
    if (container instanceof HTMLElement || container == undefined) {
      this.container = container;
      this.sendContainer();
    }
  }

  render() {
    return html`<div class="container" ${ref(this.onContainer)}></div>`;
  }

  static styles = css`
    :host {
      flex: 1;
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
    'itk-view-2d-vtkjs': ItkView2dVtkjs;
  }
}
