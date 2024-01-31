import { CreateBox } from "@babylonjs/core/Meshes/Builders";
import { StateOperation, componentExists, config } from "../config";
import { StandardMaterial } from "@babylonjs/core/Materials";
import { Color3 } from "@babylonjs/core";
import { filter } from "rxjs/operators";

const { scene, $room_stream } = config;



$room_stream.pipe(
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