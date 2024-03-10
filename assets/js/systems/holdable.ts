import { filter, take } from "rxjs/operators";
import { Config, StateOperation, componentExists } from "../config";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Tags } from "@babylonjs/core/Misc/tags";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";

export const init = (config: Config) => {

  const { scene, $state_mutations } = config;



  // to aid in mesh intersection with right or left hand we'll use this large-ish sphere
  const detection_sphere = CreateSphere("detection_sphere", { diameter: 0.2, segments: 16 }, scene);
  // detection_sphere.isVisible = false;
  detection_sphere.visibility = 0.3;



  /**
   * Whenever we create or update an entity with a holdable component
   * add or remove the holdable tag from the mesh
   */
  $state_mutations.pipe(
    filter(componentExists("holdable")),
    filter(evt => (evt.op === StateOperation.create || evt.op === StateOperation.update)),
  ).subscribe((evt) => {
    const mesh = scene.getMeshByName(evt.eid);
    if (!mesh) {
      return;
    }
    if (evt.com["holdable"] === true) {
      // add tag
      Tags.AddTagsTo(mesh, "holdable");
      console.log("add tag holdable", mesh.name);
    } else if (evt.com["holdable"] === null) {
      // remove tag
      Tags.RemoveTagsFrom(mesh, "holdable");
      console.log("remove tag holdable", mesh.name);
    }
  });


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
    // we need to update the matrix or else the intersection will not work
    detection_sphere.computeWorldMatrix(true);
    const meshes = scene.getMeshesByTags("holdable");

    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      const result = detection_sphere.intersectsMesh(mesh, true);
      console.log("comparing", mesh.name, mesh.position.asArray(), "with sphere", detection_sphere.position.asArray(), result);

      if (result) {

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
    filter(press_evt => press_evt.type === "squeeze" && press_evt.pressed?.previous === false && press_evt.pressed?.current === true),
  ).subscribe((press_evt) => {

    const mesh = hold_detection(press_evt.handedness as "left" | "right");
    if (mesh) {
      // pre-emptive parenting
      const hand_mesh = config.scene.getMeshByName(`${config.user_id}:${press_evt.handedness}`);
      if (hand_mesh) {
        mesh.setParent(hand_mesh);
      }
      // now send a message
      config.channel.push("event", { event_name: "user_picked_up", payload: { target_id: mesh.name, user_id: config.user_id, hand: press_evt.handedness } });
      // now listen for a release of the same hand
      config.$xr_button_changes.pipe(
        filter(release_evt => release_evt.type === "squeeze" && release_evt.handedness === press_evt.handedness && release_evt.pressed?.previous === true && release_evt.pressed?.current === false),
        take(1),
      ).subscribe((release_evt) => {
        // if this hand was still the parent, then send a release
        if (mesh.parent && hand_mesh && mesh.parent.name === hand_mesh.name) {
          mesh.setParent(null);

          config.channel.push("event", { event_name: "user_released", payload: { target_id: mesh.name, user_id: config.user_id, hand: release_evt.handedness } });
        }
      });
    }

  });



};