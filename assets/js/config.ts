import type { Channel, Socket } from "phoenix";
import type { Scene } from "@babylonjs/core/scene";
import type { Vector3, Quaternion } from "@babylonjs/core/Maths";
import { Subject } from "rxjs/internal/Subject";
import type { State } from "./systems/state";

export enum StateOperation {
  create = "c",
  update = "u",
  delete = "d",
}

export type RoomEvent = {
  op: StateOperation;
  eid: string;
  com?: {
    [component_name: string]: any;
  };
  note?: string;
}



// rxjs filter helper for matching if a component exists in event
export const componentExists = (component_name: string) => {
  return (evt: RoomEvent) => {
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
  $room_stream: Subject<RoomEvent>;
  $channel_joined: Subject<boolean>;
  $room_entered: Subject<boolean>;
  $camera_moved: Subject<number>;
};

export const config: Config = {
  room_id: "",
  user_id: "",
  scene: null,
  socket: null,
  channel: null,
  state: null,
  $room_stream: new Subject<RoomEvent>(),
  $channel_joined: new Subject<boolean>(),
  $room_entered: new Subject<boolean>(),
  $camera_moved: new Subject<number>(),
  
}

window["config"] = config

