import { CreateBox } from "@babylonjs/core/Meshes/Builders";
import { StateOperation, componentExists, config } from "../config";
import { filter  } from "rxjs/operators";

const { scene, $room_stream } = config;

$room_stream.pipe(
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

