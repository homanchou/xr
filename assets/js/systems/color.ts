import { StateOperation, componentExists, Config } from "../config";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { filter } from "rxjs/operators";

export const init = (config: Config) => {


  const { scene, $state_mutations } = config;

  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.create)),
    filter(componentExists("color")),
  ).subscribe((evt) => {
    const value = evt.com["color"];
    const mesh = scene.getMeshByName(evt.eid);
    if (mesh) {
      let material = new StandardMaterial(value, scene);
      material.alpha = 1;
      material.diffuseColor = new Color3(
        value[0],
        value[1],
        value[2]
      );
      mesh.material = material;
    }

  });

};