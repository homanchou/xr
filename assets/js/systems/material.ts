import { StateOperation, componentExists, Config } from "../config";
import { filter } from "rxjs/operators";
import { GridMaterial } from "@babylonjs/materials/grid/gridMaterial";
import "@babylonjs/core/Materials/standardMaterial";

export const init = (config: Config) => {


  const { scene, $state_mutations } = config;

  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.create)),
    filter(componentExists("material")),
  ).subscribe((evt) => {
    const value = evt.com["material"];
    const mesh = scene.getMeshByName(evt.eid);
    if (!mesh) {
      return
    }
    if (value === "grid") {

      // Create a grid material
      const material = new GridMaterial("grid", scene);
      mesh.material = material;
    }

  });

};