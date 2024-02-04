import { StateOperation, componentExists, Config } from "../config";
import { filter } from "rxjs/operators";

export const init = (config: Config) => {

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
}
