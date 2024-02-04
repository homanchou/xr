import type { Channel, Socket } from "phoenix";
import type { Scene } from "@babylonjs/core/scene";
import { Subject } from "rxjs/internal/Subject";
import type { State } from "./systems/state";

export enum StateOperation {
  create = "c",
  update = "u",
  delete = "d",
}

export type StateMutation = {
  op: StateOperation;
  eid: string;
  com?: {
    [component_name: string]: any;
  };
  note?: string;
}



// rxjs filter helper for matching if a component exists in event
export const componentExists = (component_name: string) => {
  return (evt: StateMutation) => {
    return evt.com[component_name] !== undefined
  }
}


// export type RoomEvent = {
//   create?: {[entity_id: string]: {[component_name: string]: any}};
//   update?: {[entity_id: string]: {[component_name: string]: any}};
//   delete?: {[entity_id: string]: any};
//   note?: string;
// }

export type Config = {
  room_id: string;
  user_id: string;
  scene: Scene;
  socket: Socket;
  channel: Channel;
  state: State;
  $channel_joined: Subject<boolean>;
  $room_entered: Subject<boolean>;
  $camera_moved: Subject<number>;
  $state_mutations: Subject<StateMutation>;
};

export const config: Config = {
  room_id: "",
  user_id: "",
  scene: null,
  socket: null,
  channel: null,
  state: null,
  $channel_joined: new Subject<boolean>(),
  $room_entered: new Subject<boolean>(),
  $camera_moved: new Subject<number>(),
  $state_mutations: new Subject<StateMutation>(),
}

window["config"] = config

