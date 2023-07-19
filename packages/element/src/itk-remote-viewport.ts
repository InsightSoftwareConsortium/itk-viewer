import { PropertyValues, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Ref, ref, createRef } from 'lit/directives/ref.js';
import { SelectorController } from 'xstate-lit/dist/select-controller.js';

import {
  RemoteActor,
  createRemoteViewport,
  createTestActors,
} from '@itk-viewer/remote-viewport/remote-viewport.js';

import { ItkViewport } from './itk-viewport.js';

@customElement('itk-remote-viewport')
export class RemoteViewport extends ItkViewport {
  @property({ type: String })
  address: string | undefined;

  remote: RemoteActor;
  canvas: Ref<HTMLImageElement> = createRef();
  frame: any;

  constructor() {
    super();
    const { remote, viewport } = createRemoteViewport(createTestActors());
    this.actor = viewport;
    this.remote = remote;
    this.frame = new SelectorController(
      this,
      this.remote,
      (state) => state?.context.frame
    );
    const p = new Promise((resolve) => setTimeout(resolve, 5000));
    p.then(() => {
      this.remote.send({ type: 'render' });
    });
  }

  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('address')) {
      this.remote.send({ type: 'setAddress', address: this.address });
    }
  }

  render() {
    console.log(this.frame.value);
    return html` <h1>Remote viewport</h1>
      <img ${ref(this.canvas)}></img>`;
  }

  static styles = css`
    :host {
      margin: 0 auto;
      padding: 2rem;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-remote-viewport': RemoteViewport;
  }
}
