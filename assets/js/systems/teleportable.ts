import { StateOperation, componentExists, Config } from "../config";
import { filter, take } from "rxjs/operators";
import { WebXRFeatureName } from "@babylonjs/core/XR/webXRFeaturesManager";
import { WebXRMotionControllerTeleportation } from "@babylonjs/core/XR/features/WebXRControllerTeleportation";
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience";
import { Tags } from "@babylonjs/core/Misc/tags";

const TELEPORTABLE_TAG = "teleportable";

export const init = (config: Config) => {
  const { scene, $xr_entered, $xr_exited, $state_mutations, $xr_helper_ready } = config;
  let teleportation: WebXRMotionControllerTeleportation;

  $xr_helper_ready.pipe(take(1)).subscribe(xr_helper => {

    $xr_entered.subscribe(() => {
      // enable the teleporation feature on the xrHelper
      teleportation =
        xr_helper.baseExperience.featuresManager.enableFeature(
          WebXRFeatureName.TELEPORTATION,
          "latest" /* or latest */,
          {
            xrInput: xr_helper.input,
            floorMeshes: [],
            defaultTargetMeshOptions: {
              teleportationFillColor: "yellow",
              teleportationBorderColor: "green",
              timeToTeleport: 0,
              disableAnimation: true,
              disableLighting: true,
            },
            forceHandedness: "right",
          }
        ) as WebXRMotionControllerTeleportation;
      teleportation.rotationEnabled = false;
      teleportation.straightRayEnabled = false;
      teleportation.parabolicCheckRadius = 0.5;
      window["teleportation"] = teleportation;
      // grab all existing entities that are a floor and add them into the teleporation feature manager
      const meshes = scene.getMeshesByTags(TELEPORTABLE_TAG);
      teleportation["_floorMeshes"] = meshes;
    });

    $xr_exited.subscribe(() => {
      xr_helper.baseExperience.featuresManager.disableFeature(WebXRFeatureName.TELEPORTATION);
      teleportation = null;
    });

  });



  const add_entity_as_floor = (eid: string) => {
    const mesh = scene.getMeshByName(eid);
    if (mesh) {
      Tags.AddTagsTo(mesh, TELEPORTABLE_TAG);
    }
    if (teleportation) {
      teleportation.addFloorMesh(mesh);
    }
  };

  const remove_entity_as_floor = (eid: string) => {
    const mesh = scene.getMeshByName(eid);
    if (mesh) {
      Tags.RemoveTagsFrom(mesh, TELEPORTABLE_TAG);
    }
    if (teleportation) {
      if (mesh) {
        teleportation.removeFloorMesh(mesh);
      } else {
        // in case mesh was removed by another system
        teleportation["_floorMeshes"] = teleportation["_floorMeshes"].filter((mesh) => mesh.name !== eid);
      }
    }
  };

  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.create || evt.op === StateOperation.update)),
    filter(componentExists("teleportable")),
  ).subscribe((evt) => {
    if (evt.com["teleportable"]) {
      add_entity_as_floor(evt.eid);
    } else {
      remove_entity_as_floor(evt.eid);
    }
  });

  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.delete)),
    filter(componentExists("teleportable")),
  ).subscribe((evt) => {
    remove_entity_as_floor(evt.eid);
  });


};
