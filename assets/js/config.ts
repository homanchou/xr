import type { Channel, Socket } from "phoenix";
import type { Scene } from "@babylonjs/core/scene";
import type { Vector3, Quaternion } from "@babylonjs/core/Maths";
import { Subject } from "rxjs/internal/Subject";


export type Config = {
  room_id: string;
  user_id: string;
  scene: Scene;
  socket: Socket;
  channel: Channel;
  $room_stream: Subject<{ event: string, payload: any; }>;
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
  $room_stream: new Subject<{ event: string, payload: any; }>(),
  $channel_joined: new Subject<boolean>(),
  $room_entered: new Subject<boolean>(),
  $camera_moved: new Subject<number>()
}

window["config"] = config

