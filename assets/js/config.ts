import type { Socket } from "phoenix"
import type { Scene } from "@babylonjs/core/scene"
import type { Vector3, Quaternion } from "@babylonjs/core/Maths"
import { Subject } from "rxjs"


export type Config = {
  room_id: string
  user_id: string
  scene: Scene
  socket: Socket
  $presence_state: Subject<{[user_id: string]: any }>
  $presence_diff: Subject<{joins: {[user_id: string]: any }, leaves: {[user_id: string]: any }}>
  $camera_moved: Subject<[Vector3, Quaternion]>
  $user_moved: Subject<{user_id: string, position: number[], rotation: number[]}>
}

export const config: Config = {
  room_id: "",
  user_id: "",
  scene: null,
  socket: null,
  $presence_state: new Subject<{[user_id: string]: any }>(),
  $presence_diff: new Subject<{joins: {[user_id: string]: any }, leaves: {[user_id: string]: any }}>,
  $camera_moved: new Subject<[Vector3, Quaternion]>(),
  $user_moved: new Subject<{user_id: string, position: number[], rotation: number[]}>(),
}

