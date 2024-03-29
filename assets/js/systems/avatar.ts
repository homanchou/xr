import {
  Config,
  StateOperation,
  componentExists,
} from "../config";
import { Quaternion } from "@babylonjs/core/Maths/math";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import {
  throttleTime,
  take,
  filter,
  skip,
  takeUntil,
  scan,
  map,
} from "rxjs/operators";
import { fromBabylonObservable, truncate } from "../utils";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
// import { UniversalCamera } from "@babylonjs/core/Cameras/";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";

// how often to sync movement
export const MOVEMENT_SYNC_FREQ = 50; // milliseconds

const head_pos_rot = (cam: UniversalCamera) => {
  const position = truncate(cam.position.asArray());
  const rotation = truncate(cam.absoluteRotation.asArray());
  return position.concat(rotation);
};

const hand_pos_rot = (node: AbstractMesh) => {
  const position = truncate(node.position.asArray());
  const rotation = truncate(node.absoluteRotationQuaternion.asArray());
  return position.concat(rotation);
};

export const init = (config: Config) => {
  const cache = new Map<string, AbstractMesh>();

  const {
    scene,
    $channel_joined,
    channel,
    $state_mutations,
    $xr_entered,
    $xr_exited,
    $xr_helper_ready,
  } = config;

  // subscribe just one time to the channel joined event
  // and create a new subscription that takes all camera movement,
  // throttles it, truncates the numbers and  sends it to the server
  $channel_joined.pipe(take(1)).subscribe(() => {
    // create a signal that the camera moved (this would be the non-xr camera)
    fromBabylonObservable(scene.activeCamera.onViewMatrixChangedObservable)
      .pipe(
        skip(3), // avoid some noise (feedback while setting camera to previous position)
        throttleTime(MOVEMENT_SYNC_FREQ),
      )
      .subscribe((cam) => {
        //$camera_moved.next(cam as UniversalCamera);
        channel.push("i_moved", {
          pose: { head: head_pos_rot(cam as UniversalCamera) },
        });
      });
  });

  $xr_helper_ready.pipe(take(1)).subscribe(xr_helper => {
    $xr_entered.subscribe(async () => {
      const xr_camera = scene.activeCamera as UniversalCamera;
      fromBabylonObservable(
        xr_helper.baseExperience.sessionManager.onXRFrameObservable
      )
        .pipe(
          takeUntil($xr_exited),
          throttleTime(MOVEMENT_SYNC_FREQ),
          scan(
            (acc, _frame) => {
              acc.prev = { ...acc.curr };
              acc.curr.head = head_pos_rot(xr_camera);
              if (config.hand_controller.left_grip) {
                acc.curr.left = hand_pos_rot(config.hand_controller.left_grip);
              }
              if (config.hand_controller.right_grip) {
                acc.curr.right = hand_pos_rot(config.hand_controller.right_grip);
              }
              return acc;
            },
            {
              prev: {
                head: [0, 0, 0, 0, 0, 0, 1],
                left: [0, 0, 0, 0, 0, 0, 1],
                right: [0, 0, 0, 0, 0, 0, 1],
              },
              curr: {
                head: [0, 0, 0, 0, 0, 0, 1],
                left: [0, 0, 0, 0, 0, 0, 1],
                right: [0, 0, 0, 0, 0, 0, 1],
              },
            }
          ),
          filter(
            ({ prev, curr }) =>
              // there is some difference between prev and curr
              prev.head[0] !== curr.head[0] ||
              prev.left[0] !== curr.left[0] ||
              prev.right[0] !== curr.right[0] ||
              prev.left[1] !== curr.left[1] ||
              prev.right[1] !== curr.right[1] ||
              prev.left[2] !== curr.left[2] ||
              prev.right[2] !== curr.right[2]
          ),
          filter(
            ({ prev, curr }) =>
              // all three positions have come online, e.g. not the default dummy positions
              curr.head[0] !== 0 &&
              curr.left[0] !== 0 &&
              curr.right[0] !== 0
          ),
          map(({ curr }) => curr)
        )
        .subscribe((pose) => {
          channel.push("i_moved", { pose });
        });
    });

  });




  // reacting to incoming events to draw other users, not self

  // user_joined
  $state_mutations
    .pipe(
      filter((e) => e.op === StateOperation.create),
      filter(componentExists("avatar"))
    )
    .subscribe((e) => {
      if (e.eid === config.user_id) {
        // when reloading the page, set scene camera to last known position, or spawn point
        const cam = scene.activeCamera as UniversalCamera;
        cam.position.fromArray(e.com.pose.head.slice(0, 3));
        cam.rotationQuaternion = Quaternion.FromArray(e.com.pose.head.slice(3));
      }
      createSimpleUser(e.eid, e.com.pose);
    });

  // user_left
  $state_mutations
    .pipe(
      filter((e) => e.op === StateOperation.delete),
      filter(componentExists("avatar"))
    )
    .subscribe((e) => {
      removeUser(e.eid);
    });

  // user_moved
  $state_mutations
    .pipe(
      filter((e) => e.op === StateOperation.update),
      // tap(e => console.log("user moved", e)),
      filter(e => e.eid !== config.user_id),
      filter(componentExists("avatar"))
    )
    .subscribe((e) => {
      if (!cache.has(headId(e.eid))) {
        createSimpleUser(e.eid, e.com.pose);
      }
      poseUser(e.eid, e.com.pose);
    });

  const headId = (user_id: string) => `${user_id}:head`;
  const leftId = (user_id: string) => `${user_id}:left`;
  const rightId = (user_id: string) => `${user_id}:right`;

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

  const createSimpleUser = (
    user_id: string,
    pose: { head: number[]; left?: number[]; right?: number[]; }
  ) => {
    console.log("in create simple user", user_id, pose);
    let head = cache.get(headId(user_id));
    if (!head) {
      head = CreateBox(
        headId(user_id),
        { width: 0.15, height: 0.3, depth: 0.25 },
        scene
      );
      cache.set(headId(user_id), head);
    }
    let left = cache.get(leftId(user_id));
    if (!left) {
      left = CreateBox(
        leftId(user_id),
        { width: 0.1, height: 0.1, depth: 0.2 },
        scene
      );
      cache.set(leftId(user_id), left);
    }
    let right = cache.get(rightId(user_id));
    if (!right) {
      right = CreateBox(
        rightId(user_id),
        { width: 0.1, height: 0.1, depth: 0.2 },
        scene
      );
      cache.set(rightId(user_id), right);
    }

    poseUser(user_id, pose);
  };

  const poseUser = (
    user_id: string,
    pose: { head: number[]; left?: number[]; right?: number[]; }
  ) => {
    console.log("in pose user", user_id, pose);
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
