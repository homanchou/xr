import { filter } from "rxjs/operators";
import { Config, StateOperation, componentExists } from "../config";

export const init = (config: Config) => {
  const { scene, $state_mutations } = config;
  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.update || evt.op === StateOperation.create)),
    filter(componentExists("parent")),
  ).subscribe((evt) => {
    const parent_mesh_id = evt.com["parent"];
    const child_mesh = scene.getMeshByName(evt.eid);
    if (!child_mesh) {
      return;
    }
    if (parent_mesh_id === null) {
      child_mesh.setParent(null);
      return;
    }
    setTimeout(() => {
      // wait a bit for the parent mesh to be created
      const parent_mesh = scene.getMeshByName(parent_mesh_id);
      if (parent_mesh) {
        child_mesh.setParent(parent_mesh);
      }
    }, 10);
  });
};