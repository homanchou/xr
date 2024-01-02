import { config } from "../config";
import { TransformNode } from "@babylonjs/core";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";

const { scene } = config;

config.$presence_state.subscribe((payload) => {
  for (const user_id in payload) {
    createSimpleUser(user_id);
  }
});

config.$presence_diff.subscribe((payload) => {
  for (const user_id in payload.joins) {
    createSimpleUser(user_id);
  }
  for (const user_id in payload.leaves) {
    removeUser(user_id);
  }
});

const removeUser = (user_id: string) => {
  const user = scene.getTransformNodeByName(user_id);
  if (user) {
    user.dispose();
  }
};

const createSimpleUser = (user_id: string) => {
  if (user_id !== config.user_id) {
    const user = scene.getTransformNodeByName(user_id);
    if (!user) {
      const transform = new TransformNode(user_id, scene);
      const box = CreateBox("head");
      box.parent = transform;
    }
  }
};
