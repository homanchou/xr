import { Config, StateOperation, componentExists } from "../config";
import { Quaternion } from "@babylonjs/core/Maths/math";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { throttleTime, take, filter, tap, mergeWith } from "rxjs/operators";
import { truncate } from "../utils";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
// import { UniversalCamera } from "@babylonjs/core/Cameras/";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";

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

    const head_pos_rot = () => {
      const cam = scene.activeCamera;
      const position = truncate(cam.position.asArray());
      const rotation = truncate(cam.absoluteRotation.asArray());
      return position.concat(rotation);
    };

    const pose = { head: head_pos_rot(), left: null, right: null };

    config.hand_controller.left_moved.subscribe(left_pos => {
      const rot = truncate(config.hand_controller.left_grip.rotationQuaternion.asArray());
      pose.left = left_pos.concat(rot);
    });

    config.hand_controller.right_moved.subscribe(right_pos => {
      const rot = truncate(config.hand_controller.right_grip.rotationQuaternion.asArray());
      pose.right = right_pos.concat(rot);
    });

    config.$camera_moved.subscribe(() => {
      pose.head = head_pos_rot();
    });

    config.$xr_exited.subscribe(() => {
      pose.left = null;
      pose.right = null;
    });

    $camera_moved.pipe(mergeWith(config.hand_controller.left_moved, config.hand_controller.right_moved)).pipe(
      throttleTime(MOVEMENT_SYNC_FREQ),
    ).subscribe(() => {
      channel.push("i_moved", { pose });
    });

  });

  // reacting to incoming events to draw other users, not self


  // user_joined
  $state_mutations.pipe(
    filter(e => e.op === StateOperation.create),

    filter(componentExists("tag", "avatar")),
  ).subscribe(e => {
    if (e.eid === config.user_id) {
      // when reloading the page, set scene camera to last known position, or spawn point
      const cam = scene.activeCamera as UniversalCamera;
      cam.position.fromArray(e.com.pose.head.slice(0, 3));
      cam.rotationQuaternion = Quaternion.FromArray(e.com.pose.head.slice(3));
      return;
    }
    createSimpleUser(e.eid, e.com.pose);
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
    // tap(e => console.log("user moved", e)),
    filter(e => e.eid !== config.user_id),
    filter(componentExists("tag", "avatar")),
  ).subscribe(e => {
    if (!cache.has(headId(e.eid))) {
      createSimpleUser(e.eid, e.com.pose);
    }
    poseUser(e.eid, e.com.pose);
  });


  const headId = (user_id: string) => `head_${user_id}`;
  const leftId = (user_id: string) => `left_${user_id}`;
  const rightId = (user_id: string) => `right_${user_id}`;

  const removeUser = (user_id: string) => {
    const head = cache.get(headId(user_id));
    if (head) {
      head.dispose();
      cache.delete(headId(user_id));
    }
    const left = cache.get(leftId(user_id));
    if (left) {
      left.dispose();
      cache.delete(leftId(user_id));
    }
    const right = cache.get(rightId(user_id));
    if (right) {
      right.dispose();
      cache.delete(rightId(user_id));
    }
  };



  const createSimpleUser = (user_id: string, pose: { head: number[]; left?: number[]; right?: number[]; }) => {

    let head = cache.get(headId(user_id));
    if (!head) {
      head = CreateBox(headId(user_id), { width: 0.15, height: 0.3, depth: 0.25 }, scene);
      cache.set(headId(user_id), head);

    }
    let left = cache.get(leftId(user_id));
    if (!left) {
      left = CreateBox(leftId(user_id), { width: 0.1, height: 0.1, depth: 0.2 }, scene);
      cache.set(leftId(user_id), left);
    }
    let right = cache.get(rightId(user_id));
    if (!right) {
      right = CreateBox(rightId(user_id), { width: 0.1, height: 0.1, depth: 0.2 }, scene);
      cache.set(rightId(user_id), right);
    }

    poseUser(user_id, pose);

  };

  const poseUser = (user_id: string, pose: { head: number[]; left?: number[]; right?: number[]; }) => {

    const head = cache.get(headId(user_id));
    if (head) {
      //position is first 3 elements of pose array
      const position = pose.head.slice(0, 3);
      //rotation is last 4 elements of pose array
      const rotation = pose.head.slice(3);
      head.position.fromArray(position);
      if (!head.rotationQuaternion) {
        head.rotationQuaternion = Quaternion.FromArray(rotation);
      } else {
        head.rotationQuaternion.x = rotation[0];
        head.rotationQuaternion.y = rotation[1];
        head.rotationQuaternion.z = rotation[2];
        head.rotationQuaternion.w = rotation[3];
      }
    }

    if (pose.left) {
      const left = cache.get(leftId(user_id));
      if (left) {
        const position = pose.left.slice(0, 3);
        const rotation = pose.left.slice(3);
        left.position.fromArray(position);
        if (!left.rotationQuaternion) {
          left.rotationQuaternion = Quaternion.FromArray(rotation);
        } else {
          left.rotationQuaternion.x = rotation[0];
          left.rotationQuaternion.y = rotation[1];
          left.rotationQuaternion.z = rotation[2];
          left.rotationQuaternion.w = rotation[3];
        }
      }
    }

    if (pose.right) {
      const right = cache.get(rightId(user_id));
      if (right) {
        const position = pose.right.slice(0, 3);
        const rotation = pose.right.slice(3);
        right.position.fromArray(position);
        if (!right.rotationQuaternion) {
          right.rotationQuaternion = Quaternion.FromArray(rotation);
        } else {
          right.rotationQuaternion.x = rotation[0];
          right.rotationQuaternion.y = rotation[1];
          right.rotationQuaternion.z = rotation[2];
          right.rotationQuaternion.w = rotation[3];
        }
      }
    }


  };

};