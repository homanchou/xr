import { config } from "../config";
import { Quaternion, TransformNode } from "@babylonjs/core";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";

const { scene, channel } = config;

let lastSyncTime = 0;
const throttleTime = 200; // ms
// when the camera moves, push data to channel but limit to every 200ms
scene.activeCamera.onViewMatrixChangedObservable.add(cam => {
  console.log("camera moved");
  if (Date.now() - lastSyncTime > throttleTime) {
    config.channel.push("i_moved", {
      position: cam.position.asArray(),
      rotation: cam.absoluteRotation.asArray(),
    });
    lastSyncTime = Date.now();
  }
});


channel.on("user_joined", (payload: { user_id: string, position: number[], rotation: number[]; }) => {
  console.log("user_joined", payload);
  createSimpleUser(payload.user_id, payload.position, payload.rotation);
});

channel.on("user_left", (payload: { user_id: string; }) => {
  console.log("user_left", payload);
  removeUser(payload.user_id);
});

channel.on("user_moved", (payload: { user_id: string, position: number[], rotation: number[]; }) => {
  console.log("user_moved", payload);
  poseUser(payload.user_id, payload.position, payload.rotation);
});


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
