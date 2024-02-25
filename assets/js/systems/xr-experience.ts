import { Config } from "../config";
import * as Browser from "../browser";
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience";
import { WebXRState } from "@babylonjs/core/XR/webXRTypes";

export const init = async (config: Config) => {
  if (!Browser.xrSupported()) {
    return;
  }

  await import("@babylonjs/core/Helpers/sceneHelpers");

  const { scene, $xr_entered, $xr_exited } = config;

  // so that the glasses icon is not rendered until after the modal is dismissed
  config.$room_entered.subscribe(async () => {

    const xr_helper = await scene.createDefaultXRExperienceAsync({});
    config.$xr_helper_ready.next(xr_helper);

    xr_helper.baseExperience.onStateChangedObservable.add((state: WebXRState) => {
      if (state === WebXRState.IN_XR) {
        $xr_entered.next(true);
      } else if (state === WebXRState.NOT_IN_XR) {
        $xr_exited.next(true);
      }

    });

    // probably a headset
    if (Browser.isMobileVR()) {
      await enterXR(xr_helper);
    }
  });
};

export const enterXR = async (xrHelper: WebXRDefaultExperience) => {
  return xrHelper.baseExperience.enterXRAsync(
    "immersive-vr",
    "local-floor" /*, optionalRenderTarget */
  );
};