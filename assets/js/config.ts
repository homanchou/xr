import type { Socket } from "phoenix"
import type { Scene } from "@babylonjs/core/scene"
import { Subject } from "rxjs"

export type Config = {
  room_id: string
  user_id: string
  scene: Scene
  socket: Socket
  $presence_state: Subject<{[user_id: string]: any }>
  $presence_diff: Subject<{joins: {[user_id: string]: any }, leaves: {[user_id: string]: any }}>
}

export const config: Config = {
  room_id: "",
  user_id: "",
  scene: null,
  socket: null,
  $presence_state: new Subject<{[user_id: string]: any }>(),
  $presence_diff: new Subject<{joins: {[user_id: string]: any }, leaves: {[user_id: string]: any }}>
}

