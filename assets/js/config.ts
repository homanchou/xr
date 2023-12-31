import type { Socket } from "phoenix"
import type { Scene } from "@babylonjs/core/scene"

export type Config = {
  room_id: string
  user_id: string
  scene: Scene
  socket: Socket
}

export const config: Config = {
  room_id: "",
  user_id: "",
  scene: null,
  socket: null
}