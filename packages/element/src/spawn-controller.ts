import { LitElement, ReactiveController } from 'lit';
import { Actor, AnyActor, AnyActorLogic } from 'xstate';

export class SpawnController<TLogic extends AnyActorLogic>
  implements ReactiveController
{
  private host: HTMLElement;
  type: string;
  logic: TLogic;
  onActor: (actor: Actor<TLogic>) => void;

  constructor(
    host: LitElement,
    type: string,
    logic: TLogic,
    onActor: (actor: Actor<TLogic>) => void,
  ) {
    (this.host = host).addController(this);
    this.type = type;
    this.logic = logic;
    this.onActor = onActor;
  }

  hostConnected() {
    const event = new CustomEvent(this.type, {
      bubbles: true,
      composed: true,
      detail: {
        logic: this.logic,
        onActor: this.onActor,
      },
    });

    this.host.dispatchEvent(event);
  }
}

export const handleLogic =
  <TActor extends AnyActor>(parentActor: TActor | undefined) =>
  (e: Event) => {
    if (!parentActor) throw new Error('Parent actor not available');
    e.stopPropagation();
    const logic = (e as CustomEvent).detail.logic;
    parentActor.send({
      type: 'createChild',
      //@ts-expect-error childType not expected on EventObject
      childType: e.type,
      logic,
      onActor: (e as CustomEvent).detail.onActor,
    });
  };
