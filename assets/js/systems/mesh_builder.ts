import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { StateOperation, componentExists, Config } from "../config";
import { filter  } from "rxjs/operators";

export const init = (config: Config) => {
  


  const { scene, $state_mutations, channel } = config;


  channel.on("entities_state", (payload: { [entity_id: string]: {[component_name: string]: any} }) => {
    for (const [entity_id, components] of Object.entries(payload)) {
      $state_mutations.next({op: StateOperation.create, eid: entity_id, com: components});
    }
  });



  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.create)),
    filter(componentExists("mesh_builder")),
  ).subscribe((evt) => {
    const value = evt.com["mesh_builder"];
    const [mesh_type, mesh_args] = value
    if (mesh_type === "box") {
      const box =
        scene.getMeshByName(evt.eid) ||
        CreateBox(evt.eid, mesh_args, scene);
    } 
  })

}