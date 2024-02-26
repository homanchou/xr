import { filter } from "rxjs";
import { Config, StateOperation, componentExists } from "../config";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { Tags } from "@babylonjs/core/Misc/tags";

export const init = (config: Config) => {

  const { scene, $state_mutations } = config;

  /**
   * Whenever we create or update an entity with a holdable component
   * add or remove the holdable tag from the mesh
   */
  $state_mutations.pipe(
    filter(componentExists("holdable")),
    filter(evt => (evt.op === StateOperation.create || evt.op === StateOperation.update)),
  ).subscribe((evt) => {
    const holdable = evt.com["holdable"];
    const mesh = scene.getMeshByName(evt.eid);
    if (!mesh) {
      return;
    }
    if (holdable) {
      // add tag
      Tags.AddTagsTo(mesh, "holdable");
    } else {
      // remove tag
      Tags.RemoveTagsFrom(mesh, "holdable");
    }
  });

  // to aid in mesh intersection with right or left hand we'll use this large-ish sphere
  const detection_sphere = CreateSphere("detection_sphere", { diameter: 0.4, segments: 16 }, scene);
  detection_sphere.visibility = 0.5;


  /**
   * First moves the sphere to the position of the grip
   * then checks for intersection with all meshes with holdable tag
   * and returns the first one found
   * 
   * @param handedness "left" | "right"
   * @returns AbstractMesh | null
   */
  const hold_detection = (handedness: "left" | "right"): AbstractMesh | null => {
    const grip = config.hand_controller[`${handedness}_grip`];
    if (!grip) {
      console.log("exiting no grip");
      return;
    }
    // move detection sphere to grip position then check for intersection with all meshes with holdable tag
    detection_sphere.position.copyFrom(grip.position);
    const meshes = scene.getMeshesByTags("holdable");

    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      console.log("comparing", mesh.name);
      if (mesh.intersectsMesh(detection_sphere)) {
        console.log("found mesh");
        return mesh;
      }
    }
    console.log("no mesh found");
  };


  /**
   * Whenever we detect a squeeze on a holdable mesh
   * send a message to the server
   */
  config.$xr_button_changes.pipe(
    filter(evt => evt.type === "squeeze" && evt.pressed?.previous === false && evt.pressed?.current === true),
  ).subscribe((evt) => {

    const mesh = hold_detection(evt.handedness as "left" | "right");
    if (mesh) {
      config.channel.push("event", { event_name: "user_picked_up", payload: { target_id: mesh.name, user_id: config.user_id, hand: evt.handedness } });
    }

  });



};