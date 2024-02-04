import { StateOperation, componentExists, config } from "../config";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { filter } from "rxjs/operators";

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
      value[0] / 255,
      value[1] / 255,
      value[2] / 255
    );
    mesh.material = material;
  }
  
})