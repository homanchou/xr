import { StateOperation, componentExists, config } from "../config";
import { filter } from "rxjs/operators";

const { scene, $state_mutations } = config;

$state_mutations.pipe(
  filter(evt => (evt.op === StateOperation.create)),
  filter(componentExists("position")),
).subscribe((evt) => {
  const value = evt.com["position"];
  const mesh = scene.getMeshByName(evt.eid);
  if (mesh) {
    mesh.position.fromArray(value);
  }
})
