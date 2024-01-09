import { AnyActorLogic, AnyActorRef } from 'xstate';

export type CreateChild = {
  type: 'createChild';
  logic: AnyActorLogic;
  childType: string;
  onActor: (actor: AnyActorRef) => unknown;
};
