import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { UtilityLayerRenderer } from "@babylonjs/core/Rendering/utilityLayerRenderer";

import { Config } from "../config";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { scan } from "rxjs/internal/operators/scan";
import { concat, concatMap, concatWith, filter, map, merge, mergeAll, mergeWith, switchMap, tap, timeout } from "rxjs/operators";
import { interval, timer } from "rxjs";

let plane: AbstractMesh;
let guiText: TextBlock;

export const init = (config: Config) => {
  const { scene } = config;

  createTextureWall();
  parentPlaneToCamera(config);

  config.$hud_text.pipe(
    scan((acc, text) => {
      acc.buffer.push(text);
      if (acc.buffer.length > 10) { acc.buffer.shift(); }
      // cancel previous timeout
      if (acc.timeout) {
        clearTimeout(acc.timeout);
      }
      acc.timeout = setTimeout(() => {
        acc.buffer = [];
        guiText.text = "";
      }, 5000);
      return acc;
    }, { buffer: [], timeout: null }),

  ).subscribe(payload => {
    guiText.text = payload.buffer.join("\n");
  });


};

const createTextureWall = () => {
  console.log("creating the utility layer");
  const utilLayer = UtilityLayerRenderer.DefaultUtilityLayer;
  plane = CreatePlane("hud_msg_plane", { size: 5 }, utilLayer.utilityLayerScene);
  plane.position.z = 2.5;
  plane.isPickable = false;
  // plane.visibility = 0
  // plane.setEnabled(false)

  const texture = AdvancedDynamicTexture.CreateForMesh(plane, 2024, 2024, false);
  texture.hasAlpha = true;
  guiText = new TextBlock("hud_text", "");
  guiText.color = "white";
  guiText.fontSize = 100;
  guiText.textWrapping = true;
  texture.addControl(guiText);

};

const parentPlaneToCamera = (config: Config) => {
  config.$room_entered.subscribe(() => {
    plane.parent = config.scene.activeCamera;
  });

  config.$xr_entered.subscribe(() => {
    plane.parent = config.scene.activeCamera;
  });

  config.$xr_exited.subscribe(() => {
    plane.parent = config.scene.activeCamera;
  });
};
