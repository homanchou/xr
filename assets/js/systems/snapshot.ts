import { CreateBox } from "@babylonjs/core/Meshes/Builders";
import { config } from "../config";

const { scene, channel } = config;

channel.on("snapshot", (payload) => {
  // payload is an object of entities, let's go through every one of them
  Object.entries(payload).forEach(([key, value]) => {
    process_entity(key, value as any);
  });
});

const process_entity = (entity_id: string, components: object) => {
  // only react if the mesh_builder component is present in components
  if (components["mesh_builder"]) {
    const [mesh_type, mesh_args] = components["mesh_builder"];
    // currently only handling box type at the moment
    if (mesh_type === "box") {
      const box = CreateBox(entity_id, mesh_args, scene);
      if (components["position"]) {
        box.position.fromArray(components["position"]);
      }
    }
  }
};