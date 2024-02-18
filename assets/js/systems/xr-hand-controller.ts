import { Config } from "../config";
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience";
import { fromBabylonObservable } from "../utils";
import { filter, take, takeUntil } from "rxjs/operators";
import type { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { Observable } from "rxjs/internal/Observable";

export const init = async (config: Config) => {
  const { $xr_helper_created } = config;
  $xr_helper_created.subscribe((xrHelper: WebXRDefaultExperience) => {
    setup_hand_controllers(xrHelper);
  });

  const setup_hand_controllers = (xrHelper: WebXRDefaultExperience) => {
    // this will be called for both left and right hands
    fromBabylonObservable(xrHelper.input.onControllerAddedObservable).subscribe((input_source: WebXRInputSource) => {
      const handedness = input_source.inputSource.handedness;
      const $controller_removed = fromBabylonObservable(xrHelper.input.onControllerRemovedObservable).pipe(
        filter((controller) => controller.inputSource.handedness === handedness),
        take(1)
      );
      // wait until model is ready
      input_source.onMotionControllerInitObservable.addOnce(mc => {
        mc.onModelLoadedObservable.addOnce(() => {
          observe_components(input_source, $controller_removed);
          observe_motion(input_source, $controller_removed);
        });
      });
    });
  };

  const observe_motion = (input_source: WebXRInputSource, $controller_removed: Observable<WebXRInputSource>) => {
    const handedness = input_source.inputSource.handedness;
    const movement_bus = `${handedness}_moved`;

    input_source.onMeshLoadedObservable.addOnce(() => {
      // grip should be available

      config.hand_controller[`${handedness}_grip`] = input_source.grip;
      fromBabylonObservable(input_source.grip.onAfterWorldMatrixUpdateObservable).pipe(
        takeUntil($controller_removed)
      ).subscribe(() => {
        config.hand_controller[movement_bus].next(true);
      });

    });
  };



  const observe_components = (input_source: WebXRInputSource, $controller_removed: Observable<WebXRInputSource>) => {

    const handedness = input_source.inputSource.handedness;
    const button_subject = `${handedness}_button`;
    const axes_subject = `${handedness}_axes`;

    const componentIds = input_source.motionController.getComponentIds() || [];
    // for every button type (component), stream changes to subject
    componentIds.forEach((componentId) => {
      const webXRComponent = input_source.motionController.getComponent(componentId);
      fromBabylonObservable(webXRComponent.onButtonStateChangedObservable).pipe(
        takeUntil($controller_removed)
      ).subscribe((evt) => {
        config.hand_controller[button_subject].next({
          id: webXRComponent.id,
          ...evt.changes
        });
      });

      if (webXRComponent.type === "thumbstick") {
        fromBabylonObservable(webXRComponent.onAxisValueChangedObservable).pipe(
          takeUntil($controller_removed)
        ).subscribe((evt) => {
          config.hand_controller[axes_subject].next(evt);
        });
      }
    });




  }; // ends init

};
