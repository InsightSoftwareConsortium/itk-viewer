import { LitElement, PropertyValues, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ViewControls, ViewActor } from './view-controls-controller.js';
import { ref } from 'lit/directives/ref.js';

@customElement('itk-view-controls-shoelace')
export class ViewControlsShoelace extends LitElement {
  @property({ type: String })
  view: '2d' | '3d' = '2d';

  actor: ViewActor | undefined;
  private controls = new ViewControls(this);

  @state()
  selectedComponent = 0;

  setActor(actor: ViewActor) {
    this.actor = actor;
    this.controls.setActor(actor);
  }

  transferFunctionContainerChanged(container: Element | undefined) {
    this.controls.setTransferFunctionContainer(container);
  }

  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('view')) {
      this.controls.setView(this.view);
    }
  }

  render() {
    const slice = this.controls.slice?.value;
    const axis = this.controls.axis?.value;
    const imageDimension = this.controls.imageDimension?.value ?? 0;
    const scale = this.controls.scale?.value;
    const scaleCount = this.controls.scaleCount?.value ?? 1;
    const scaleOptions = Array.from(
      { length: scaleCount },
      (_, i) => i,
    ).reverse();
    const colorMapOptions = this.controls.colorMapsOptions?.value ?? {};

    const componentCount = this.controls.componentCount?.value ?? 1;
    const showComponentSelector = componentCount > 1;
    const components = Array.from({ length: componentCount }, (_, i) => i);
    const colorMap =
      this.controls.colorMaps?.value[this.selectedComponent] ?? '';

    const isImage3D = imageDimension >= 3;
    const showScale = scaleCount >= 2;
    const tfEditorHeight = this.view === '2d' ? '2rem' : '8rem';

    return html`
      <sl-card>
        ${
          isImage3D && this.view === '2d'
            ? html`
                <sl-range
                  value=${Number(slice)}
                  @sl-change="${this.controls.onSlice}"
                  min="0"
                  max="1"
                  step=".01"
                  label="Slice"
                  style="min-width: 8rem;"
                ></sl-range>
                <sl-radio-group
                  label="Slice Axis"
                  value=${axis}
                  @sl-change="${this.controls.onAxis}"
                >
                  <sl-radio-button value="I">X</sl-radio-button>
                  <sl-radio-button value="J">Y</sl-radio-button>
                  <sl-radio-button value="K">Z</sl-radio-button>
                </sl-radio-group>
              `
            : ''
        }
        ${
          showScale
            ? html`
                <sl-radio-group
                  label="Image Scale"
                  value=${scale}
                  @sl-change="${this.controls.onScale}"
                >
                  ${scaleOptions.map(
                    (option) =>
                      html`<sl-radio-button value=${option}>
                        ${option}
                      </sl-radio-button>`,
                  )}
                </sl-radio-group>
              `
            : ''
        }
        ${
          showComponentSelector
            ? html`
                <sl-tab-group
                  style="max-width: 18rem"
                  value=${this.controls.selectedComponent}
                  @sl-tab-show="${(e: CustomEvent) => {
                    const component = Number(e.detail.name);
                    this.controls.onSelectedComponent(component);
                    // trigger re-render to update color map value
                    this.selectedComponent = Number(e.detail.name);
                  }}"
                >
                  ${components.map(
                    (option) =>
                      html`<sl-tab panel="${option}" slot="nav">
                        Component ${option}
                      </sl-tab>`,
                  )}
                </sl-tab-group>
              `
            : ''
        }
      
        <sl-dropdown
          style="padding-top: .4rem; width: 100%"
        >
          <sl-button slot="trigger" caret class="color-button">
            <sl-tooltip  content=${colorMap}>
              <img src=${colorMapOptions[colorMap] ?? ''} class='selected-swatch'></img>
            </sl-tooltip>
          </sl-button>
          <sl-menu
            @sl-select=${(e: CustomEvent) => {
              this.controls.onColorMap(e.detail.item.value);
            }}
            class="color-button"
          >
            ${Object.entries(colorMapOptions).map(
              ([value, icon]) =>
                html`<sl-menu-item value=${value}> 
                  <div class='swatch'> <img src=${icon}></img> ${value} </div>
                </sl-menu-item>`,
            )}
          </sl-menu>
        </sl-dropdown>

        <div style="padding-top: 0.4rem;">
          ${this.view === '2d' ? 'Color Range' : 'Opacity and Color'}
        </div>
        <div
          ${ref(this.transferFunctionContainerChanged)}
          style=${`width: 100%; min-width: 12rem; height: ${tfEditorHeight};`}
        ></div>
      </sl-card>
    `;
  }

  static styles = css`
    .color-button {
      width: 100%;
    }

    .color-button::part(label) {
      width: 100%;
      padding: 0;
      padding-right: var(--sl-spacing-medium);
    }

    .selected-swatch {
      width: 100%;
      height: 100%;
    }

    .swatch {
      height: 100%;
      display: flex;
    }

    .swatch img {
      width: 8rem;
      height: 100%;
      padding-right: var(--sl-spacing-small);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-view-2d-controls-shoelace': ViewControlsShoelace;
  }
}
