import { Config, StateOperation, componentExists } from "../config";
import { Quaternion } from "@babylonjs/core/Maths/math";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { throttleTime, take, filter, tap } from "rxjs/operators";
import { truncate } from "../utils";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

export const init = (config: Config) => {

  const cache = new Map<string, AbstractMesh>();

  const { scene, $channel_joined, $camera_moved, channel, $state_mutations } = config;

  // create a signal that the camera moved
  scene.activeCamera.onViewMatrixChangedObservable.add(cam => {
    $camera_moved.next(true);
  });

  const MOVEMENT_SYNC_FREQ = 200; // milliseconds

  // subscribe just one time to the channel joined event
  // and create a new subscription that takes all camera movement, 
  // throttles it, truncates the numbers and  sends it to the server
  $channel_joined.pipe(take(1)).subscribe(() => {
    $camera_moved.pipe(throttleTime(MOVEMENT_SYNC_FREQ)).subscribe(() => {
      const cam = scene.activeCamera;
      const payload = {
        position: truncate(cam.position.asArray()),
        rotation: truncate(cam.absoluteRotation.asArray()),
      };
      channel.push("i_moved", payload);
    });
  });

  // reacting to incoming events to draw other users, not self


  // user_joined
  $state_mutations.pipe(
    filter(e => e.op === StateOperation.create),
    filter(e => e.eid !== config.user_id),
    filter(componentExists("tag", "avatar")),
    tap(e => console.log("tap ta", e)),
  ).subscribe(e => {
    createSimpleUser(e.eid, e.com.head_pos, e.com.head_rot);
  });

  // user_left
  $state_mutations.pipe(
    filter(e => e.op === StateOperation.delete),
    filter(componentExists("tag", "avatar")),
  ).subscribe(e => {
    removeUser(e.eid);
  });

  // user_moved
  $state_mutations.pipe(
    filter(e => e.op === StateOperation.update),
    filter(e => e.eid !== config.user_id),
    filter(componentExists("head_pos")),
  ).subscribe(e => {
    poseUser(e.eid, e.com.head_pos, e.com.head_rot);
  });


  const headId = (user_id: string) => `head_${user_id}`;

  const removeUser = (user_id: string) => {
    const head = cache.get(headId(user_id));
    if (head) {
      head.dispose();
      cache.delete(headId(user_id));
    }
  };



  const createSimpleUser = (user_id: string, head_pos: number[], head_rot: number[]) => {


    let head = cache.get(headId(user_id));
    if (!head) {
      head = CreateBox(headId(user_id), { width: 0.15, height: 0.3, depth: 0.25 }, scene);
      cache.set(headId(user_id), head);
      poseUser(user_id, head_pos, head_rot);
    }

  };

  const poseUser = (user_id: string, position: number[], rotation: number[]) => {
    let head = cache.get(headId(user_id));
    if (!head) { return; }
    head.position.fromArray(position);
    if (!head.rotationQuaternion) {
      head.rotationQuaternion = Quaternion.FromArray(rotation);
    } else {
      head.rotationQuaternion.x = rotation[0];
      head.rotationQuaternion.y = rotation[1];
      head.rotationQuaternion.z = rotation[2];
      head.rotationQuaternion.w = rotation[3];
    }

  };

};