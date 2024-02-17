import { StateOperation, componentExists, Config } from "../config";
import { filter } from "rxjs/operators";
import { WebXRFeatureName } from "@babylonjs/core/XR/webXRFeaturesManager";
import { WebXRMotionControllerTeleportation } from "@babylonjs/core/XR/features/WebXRControllerTeleportation";
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience";
import { Tags } from "@babylonjs/core/Misc/tags";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

export const init = (config: Config) => {
  const { scene, $xr_entered, $xr_exited, $state_mutations, $xr_helper_created } = config;
  let teleportation: WebXRMotionControllerTeleportation;

  const on_helper_ready = (xrHelper: WebXRDefaultExperience) => {
    $xr_entered.subscribe(() => {
      // enable the teleporation feature on the xrHelper
      teleportation =
        xrHelper.baseExperience.featuresManager.enableFeature(
          WebXRFeatureName.TELEPORTATION,
          "latest" /* or latest */,
          {
            xrInput: xrHelper.input,
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
      const floor_meshes = scene.getMeshesByTags("floor");
      teleportation["_floorMeshes"] = floor_meshes;
    });

    $xr_exited.subscribe(() => {
      xrHelper.baseExperience.featuresManager.disableFeature(WebXRFeatureName.TELEPORTATION);
      teleportation = null;
    });

  };

  const add_entity_as_floor = (eid: string) => {
    const mesh = scene.getMeshByName(eid);
    if (mesh) {
      Tags.AddTagsTo(mesh, "floor");
    }
    if (teleportation) {
      teleportation.addFloorMesh(mesh);
    }
  };

  const remove_entity_as_floor = (eid: string) => {
    const mesh = scene.getMeshByName(eid);
    if (mesh) {
      Tags.RemoveTagsFrom(mesh, "floor");
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
    filter(evt => (evt.op === StateOperation.create)),
    filter(componentExists("floor")),
  ).subscribe((evt) => {
    add_entity_as_floor(evt.eid);
  });

  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.delete)),
    filter(componentExists("floor")),
  ).subscribe((evt) => {
    remove_entity_as_floor(evt.eid);
  });

  $xr_helper_created.subscribe((xrHelper) => {
    on_helper_ready(xrHelper);
  });

};
