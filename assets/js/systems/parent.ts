import { filter } from "rxjs/operators";
import { Config, StateOperation, componentExists } from "../config";

/*
This system primarily used for grabbing and holding objects in hands
*/
export const init = (config: Config) => {
  const { scene, $state_mutations } = config;
  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.update || evt.op === StateOperation.create)),
    filter(componentExists("parent")),
  ).subscribe((evt) => {
    const parent_mesh_id: null | string = evt.com["parent"];
    const child_mesh = scene.getMeshByName(evt.eid);
    if (!child_mesh) {
      // error can't find the child mesh in the scene
      // can't do anything, fail silently
      return;
    }
    if (parent_mesh_id === null) {
      // set this child mesh free from parents
      child_mesh.setParent(null);
      return;
    }
    // else parent the child to the parent, we'll introduce a slight delay
    // in the case we're building the scene from the entities_state and
    // this child mesh is processed before the parent mesh is defined
    setTimeout(() => {
      // wait a bit for the parent mesh to be created
      const parent_mesh = scene.getMeshByName(parent_mesh_id);
      if (parent_mesh && child_mesh.parent !== parent_mesh) {
        child_mesh.setParent(parent_mesh);
      }
    }, 10);
  });
};