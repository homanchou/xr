import { Config, XRButtonChange } from "../config";
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience";
import { fromBabylonObservable, truncate } from "../utils";
import { filter, map, take, takeUntil, scan, tap, throttleTime } from "rxjs/operators";
import type { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { Observable } from "rxjs/internal/Observable";

export const init = async (config: Config) => {

  config.$xr_helper_ready.subscribe((xr_helper) => {
    setup_hand_controllers(xr_helper);
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
          console.log("setting up hand controllers");
          observe_components(input_source, $controller_removed);
          // observe_motion(input_source, $controller_removed);
          // observe_squeeze_and_trigger(input_source, $controller_removed);
          // cache the grip so we can easily get to the position and rotation
          input_source.onMeshLoadedObservable.addOnce(() => {
            config.hand_controller[`${handedness}_grip`] = input_source.grip;
          });
        });
      });
    });
  };


  const observe_components = (input_source: WebXRInputSource, $controller_removed: Observable<WebXRInputSource>) => {

    const handedness = input_source.inputSource.handedness;
    // const button_subject = `${handedness}_button`;
    // const axes_subject = `${handedness}_axes`;

    const componentIds = input_source.motionController.getComponentIds() || [];
    // for every button type (component), stream changes to subject
    componentIds.forEach((componentId) => {
      const webXRComponent = input_source.motionController.getComponent(componentId);
      fromBabylonObservable(webXRComponent.onButtonStateChangedObservable).pipe(
        takeUntil($controller_removed)
      ).subscribe((evt) => {
        config.$xr_button_changes.next({
          handedness,
          id: webXRComponent.id,
          type: webXRComponent.type,
          ...evt.changes
        });
      });

      if (webXRComponent.type === "thumbstick") {
        fromBabylonObservable(webXRComponent.onAxisValueChangedObservable).pipe(
          takeUntil($controller_removed)
        ).subscribe((evt) => {
          config.$xr_axes.next({
            handedness,
            ...evt
          });
        });
      }
    });

  };


  // const observe_squeeze_and_trigger = (input_source: WebXRInputSource, $controller_removed: Observable<WebXRInputSource>) => {
  //   const handedness = input_source.inputSource.handedness;
  //   const button_subject = `${handedness}_button`;
  //   const squeeze_subject = `${handedness}_squeeze`;
  //   const trigger_subject = `${handedness}_trigger`;

  //   config.hand_controller[button_subject].pipe(
  //     takeUntil($controller_removed),
  //     filter((evt: XRButtonChange) => evt.type === "squeeze" && evt.pressed?.current !== evt.pressed?.previous),
  //   ).subscribe((evt) => {
  //     config.hand_controller[squeeze_subject].next(evt.pressed.current);
  //   });

  //   config.hand_controller[trigger_subject].pipe(
  //     takeUntil($controller_removed),
  //     filter((evt: XRButtonChange) => evt.type === "trigger" && evt.pressed?.current !== evt.pressed?.previous),
  //   ).subscribe((evt) => {
  //     config.hand_controller[trigger_subject].next(evt.pressed.current);
  //   });
  // };

};
