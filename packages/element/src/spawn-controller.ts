import { LitElement } from 'lit';
import { Actor, AnyActorLogic, AnyActorRef } from 'xstate';

export const dispatchSpawn = <TLogic extends AnyActorLogic>(
  host: LitElement,
  eventType: string,
  logic: TLogic,
  onActor: (actor: Actor<TLogic>) => void,
) => {
  const event = new CustomEvent(eventType, {
    bubbles: true,
    composed: true,
    detail: {
      logic: logic,
      onActor: onActor,
    },
  });
  host.dispatchEvent(event);
};

export const handleLogic = <TActor extends AnyActorRef>(
  parentActor: TActor | undefined,
) => {
  return (e: Event) => {
    if (!parentActor) throw new Error('Parent actor not available');
    e.stopPropagation();
    const logic = (e as CustomEvent).detail.logic;
    parentActor.send({
      type: 'createChild',
      childType: e.type,
      logic,
      onActor: (e as CustomEvent).detail.onActor,
    });
  };
};
