import type { Channel, Socket } from "phoenix";
import type { Scene } from "@babylonjs/core/scene";
import type { Subject } from "rxjs/internal/Subject";
import type { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";

export enum StateOperation {
  create = "c",
  update = "u",
  delete = "d",
}

/**
 * State mutation is the type of event extracted from entities_diff sync from server
 * op: StateOperation code (entity create, update, delete)
 * eid: entity_id
 * com: components that we in the entities_diff payload
 * prev: previous components prior to the entities_diff payload
 */
export type StateMutation = {
  op: StateOperation;
  eid: string;
  com: {
    [component_name: string]: any;
  };
  prev: {
    [component_name: string]: any;
  };
};

export type EntityId = string;
export type Components = { [component_name: string]: any; };
export type EntityPayload = { [entity_id: EntityId]: Components; };

// rxjs filter helper for matching if a component exists in event
// the component can be found in either the StateMustation.com or StateMutation.prev
export const componentExists = (component_name: string, component_value?: any) => {
  return (evt: StateMutation) => {
    if (component_value != undefined) {
      // only simple equality on primitives, no objects or arrays
      return evt.com[component_name] === component_value || (evt.prev[component_name] === component_value);
    }
    return evt.com[component_name] !== undefined || (evt.prev[component_name] !== undefined);
  };
};


export type Config = {
  room_id: string;
  user_id: string;
  scene: Scene;
  socket: Socket;
  channel: Channel;
  state: Map<EntityId, Components>;
  $channel_joined: Subject<boolean>;
  $room_entered: Subject<boolean>;
  $camera_moved: Subject<UniversalCamera>;
  $state_mutations: Subject<StateMutation>;
  $xr_helper_ready: Subject<WebXRDefaultExperience>;
  $xr_entered: Subject<boolean>;
  $xr_exited: Subject<boolean>;
  $xr_button_changes: Subject<XRButtonChange>;
  $xr_axes: Subject<{ x: number; y: number; handedness: "left" | "right" | "none"; }>;
  hand_controller: {
    left_grip?: AbstractMesh;
    right_grip?: AbstractMesh;
  };
};

// values are only populated if they have changed from their previous value
export type XRButtonChange = {
  handedness: "left" | "right" | "none";
  id: string; // component id (examples: "x-standard-thumbstick", "xr-standard-trigger", "b-button", "a-button", etc.)
  type: "trigger" | "squeeze" | "thumbstick" | "button" | "touchpad";
  value?: { current: number; previous: number; };
  touched?: { current: boolean; previous: boolean; };
  pressed?: { current: boolean; previous: boolean; };
  axes?: {  // axes at time of change
    current: { x: number; y: number; };
    previous: { x: number; y: number; };
  };
};
