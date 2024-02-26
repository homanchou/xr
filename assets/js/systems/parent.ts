import { filter } from "rxjs/operators";
import { Config, StateOperation, componentExists } from "../config";

export const init = (config: Config) => {
  const { scene, $state_mutations } = config;
  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.update)),
    filter(componentExists("parenting")),
  ).subscribe((evt) => {
    const value = evt.com["parenting"];
    const mesh = scene.getMeshByName(evt.eid);
    if (mesh) {
      const parent = scene.getMeshByName(value);
      if (parent) {
        mesh.setParent(parent);
      }
    }
  });
};