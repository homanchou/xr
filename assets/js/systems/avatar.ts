import { config } from "../config";
import { Quaternion, TransformNode } from "@babylonjs/core";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import type { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { filter, throttleTime, take } from "rxjs/operators";
import { truncate } from "../utils";

const { scene } = config;

// create a signal that the camera moved
scene.activeCamera.onViewMatrixChangedObservable.add(cam => {
  config.$camera_moved.next(new Date().getTime());
});

const MOVEMENT_SYNC_FREQ = 200; // milliseconds

// subscribe just one time to the channel joined event
// and create a new subscription that takes all camera movement, 
// throttles it, truncates the numbers and  sends it to the server
config.$channel_joined.pipe(take(1)).subscribe(() => {
  config.$camera_moved.pipe(throttleTime(MOVEMENT_SYNC_FREQ)).subscribe(() => {
    const cam = scene.activeCamera;
    const payload = {
      position: truncate(cam.position.asArray()),
      rotation: truncate(cam.absoluteRotation.asArray()),
    }
    config.channel.push("i_moved", payload);
  });
});

// reacting to incoming events to draw other users, not self

// user_joined
// config.$room_stream.pipe(
//   filter(e => e.event === "user_joined"),
// ).subscribe(e => {
//   if (e.payload.user_id !== config.user_id) {
//     createSimpleUser(e.payload.user_id, e.payload.position, e.payload.rotation);
//   } else {
//     console.log("it is me so set camera position", e)
//     const cam = scene.activeCamera as FreeCamera;
//     cam.position.fromArray(e.payload.position);
//     cam.rotationQuaternion = Quaternion.FromArray(e.payload.rotation);
//   }
// });

// user_left
// config.$room_stream.pipe(
//   filter(e => e.event === "user_left"),
//   filter(e => e.payload.user_id !== config.user_id)
// ).subscribe(e => {
//   removeUser(e.payload.user_id);
// });

// user_moved
// config.$room_stream.pipe(
//   filter(e => e.event === "user_moved"),
//   filter(e => e.payload.user_id !== config.user_id)
// ).subscribe(e => {
//   poseUser(e.payload.user_id, e.payload.position, e.payload.rotation);
// });

const removeUser = (user_id: string) => {
  const user = scene.getTransformNodeByName(user_id);
  if (user) {
    user.dispose();
  }
};

const createSimpleUser = (user_id: string, position: number[], rotation: number[]) => {
  if (user_id !== config.user_id) {
    const user = scene.getTransformNodeByName(user_id);
    if (!user) {
      const transform = new TransformNode(user_id, scene);
      const box = CreateBox("head");
      box.parent = transform;
      poseUser(user_id, position, rotation);
    }
  }
};

const poseUser = (user_id: string, position: number[], rotation: number[]) => {
  const transform = scene.getTransformNodeByName(user_id);
  if (transform) {
    transform.position.fromArray(position);
    if (!transform.rotationQuaternion) { transform.rotationQuaternion = Quaternion.FromArray(rotation); } else {
      transform.rotationQuaternion.x = rotation[0];
      transform.rotationQuaternion.y = rotation[1];
      transform.rotationQuaternion.z = rotation[2];
      transform.rotationQuaternion.w = rotation[3];
    }
  }
};

// config.channel.on("user_snapshot", (payload: { user_id: string, position: number[], rotation: number[]; }[]) => {
//   Object.entries(payload).forEach(([user_id, state]) => {
//     if (user_id !== config.user_id) {
//       createSimpleUser(user_id, state.position, state.rotation);
//     }

//   });
// });