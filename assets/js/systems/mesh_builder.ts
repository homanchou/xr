import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { StateOperation, componentExists, Config } from "../config";
import { filter } from "rxjs/operators";

export const init = (config: Config) => {

  const { scene, $state_mutations } = config;

  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.create)),
    filter(componentExists("mesh_builder")),
  ).subscribe((evt) => {
    const value = evt.com["mesh_builder"];
    const [mesh_type, mesh_args] = value;
    let mesh;
    switch(mesh_type) {
      case "box":
        mesh = CreateBox(evt.eid, mesh_args, scene);
        break;
      case "ground":
        mesh = CreateGround(evt.eid, mesh_args, scene);
        break;
    }
    mesh.checkCollisions = true;

  });

};