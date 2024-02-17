import { Config } from "../config";
import * as Browser from "../browser";
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience";
import { WebXRState } from "@babylonjs/core/XR/webXRTypes";
import { fromBabylonObservable } from "../utils";
import { takeUntil } from "rxjs";

export const init = async (config: Config) => {
  if (!Browser.xrSupported()) {
    return;
  }

  await import("@babylonjs/core/Helpers/sceneHelpers");

  const { scene, $xr_entered, $xr_exited, $xr_helper_created } = config;

  config.$room_entered.subscribe(async () => {
    const xrHelper = await scene.createDefaultXRExperienceAsync({});
    $xr_helper_created.next(xrHelper);

    xrHelper.baseExperience.onStateChangedObservable.add((state: WebXRState) => {
      if (state === WebXRState.IN_XR) {
        $xr_entered.next(true);
      } else if (state === WebXRState.NOT_IN_XR) {
        $xr_exited.next(true);
      }
    });

    $xr_entered.subscribe(async () => {
      fromBabylonObservable(xrHelper.baseExperience.camera.onViewMatrixChangedObservable).pipe(
        takeUntil($xr_exited)
      ).subscribe(() => {
        config.$camera_moved.next(true);
      });
    });



    // probably a headset
    if (Browser.isMobileVR()) {
      await enterXR(xrHelper);
    }
  });
};

export const enterXR = async (xrHelper: WebXRDefaultExperience) => {
  return xrHelper.baseExperience.enterXRAsync(
    "immersive-vr",
    "local-floor" /*, optionalRenderTarget */
  );
};