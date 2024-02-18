## Add Simple Hands To Avatar

We are now able to support both the desktop browser as well as the headset browser.  The headset browser also has the ability to start a WebXR session.  In the immersive session the Babylon.js default experience detects the kind of hand controllers that the headset uses and imports a mesh for each of them so the user can see them in VR.  However, the avatar system that we have created only renders a single box for the head right now.  Let's also add some simple boxes to represent the hands.  If there are no hands (which is the case for non-immersive experiences) then we should just remove the hands.

First we'll add another system dedicated to getting data from the hand controllers.  Babylon.js provides observables for when the hand controller is added:

```typescript
xrHelper.input.onControllerAddedObservable
```

Once the controller is available we can add additional subscriptions for "components".  In this context "components" refers to the different kinds of inputs that are on the device such as buttons, trigger, grip, joystick etc.  Each component has an id (like "b-button") and a type (like "button").  Let's create an RxJS stream for all of these data so that later we can filter and act on them.

### Add Data Streams for Controller Buttons

Let's design the data shape for button changes and add it into the config.ts file:

```typescript
  ...
  hand_controller: {
    left_button: Subject<XRButtonChange>;
    left_axes: Subject<{ x: number; y: number; }>;
    left_moved: Subject<any>;
    right_button: Subject<XRButtonChange>;
    right_axes: Subject<{ x: number; y: number; }>;
    right_moved: Subject<any>;
  };
}

// values are only populated if they have changed from their previous value
export type XRButtonChange = {
  id: string; // component id (examples: "x-standard-thumbstick", "xr-standard-trigger", "b-button", "a-button", etc.)
  type: string; // "trigger" | "squeeze" | "thumbstick" | "button"
  value?: { current: number; previous: number; };
  touched?: { current: boolean; previous: boolean; };
  pressed?: { current: boolean; previous: boolean; };
  axes?: {  // axes at time of change
    current: { x: number; y: number; };
    previous: { x: number; y: number; };
  };
};
```

### Create System for Emitting Hand Controller Events

This shape if given to us when we use the Babylon.js observer for component changed.  Create a new system `assets/js/systems/xr-hand-controller.ts` and start with the following:

```typescript

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

```
First we create our regular `init` function, taking in the `config` object.  Then we subscribe to the `$xr_helper_created` subject so that we are ensured to have an the default XR helper provided by Babylon.js which is initialized after the user enters the room and also after the default XR experience is async awaited.

Next we'll delegate the subscrition work to `setup_hand_controllers`.  This is expected to run only once per page load.  This function subscribes to `xrHelper.input.onControllerAddedObservable` which will run for each hand (left and right) controller.  Moreover, it can run multiple times depending on if the user exits and re-enters VR, sometimes it can run when they take off and put their headset back on momentarily.  We need to be careful to remove our subscriptions so that whever we re-enter VR we don't doubly subscribe to events.

To do this, inside the subscription to the `onControllerAddedObservable` we create another observable called `$controller_removed` for when this controller is removed.  And since that observable only needs to be subscribed to once, (because it will be recreated if the controller is added again), we can use `take(1)` to ensure we deregister the subscription as soon as we get a single event matching the filter.  This `$controller_removed` signal is fed as an argument to any other observables that need to listen to a stream of events like button presses.  Those subscriptions will keep listening to the stream of events until the controller is removed.

```typescript

  const setup_hand_controllers = (xrHelper: WebXRDefaultExperience) => {
    // this will be called for both left and right hands
    fromBabylonObservable(xrHelper.input.onControllerAddedObservable).subscribe((input_source: WebXRInputSource) => {
      const handedness = input_source.inputSource.handedness;
      const $controllerRemoved = fromBabylonObservable(xrHelper.input.onControllerRemovedObservable).pipe(
        filter((controller) => controller.inputSource.handedness === handedness),
        take(1)
      );
      // wait until model is ready
      input_source.onMotionControllerInitObservable.addOnce(mc => {
        mc.onModelLoadedObservable.addOnce(() => {
          observe_components(input_source, $controllerRemoved);
        });
      });
    });
  };

  const observe_components = (input_source: WebXRInputSource, $controllerRemoved: Observable<WebXRInputSource>) => {

    const handedness = input_source.inputSource.handedness;
    const button_subject = `${handedness}_button`;
    const axes_subject = `${handedness}_axes`;

    const componentIds = input_source.motionController.getComponentIds() || [];
    // for every button type (component), stream changes to subject
    componentIds.forEach((componentId) => {
      const webXRComponent = input_source.motionController.getComponent(componentId);
      fromBabylonObservable(webXRComponent.onButtonStateChangedObservable).pipe(
        takeUntil($controllerRemoved)
      ).subscribe((evt) => {
        config.hand_controller[button_subject].next({
          id: webXRComponent.id,
          ...evt.changes
        });
      });

      if (webXRComponent.type === "thumbstick") {
        fromBabylonObservable(webXRComponent.onAxisValueChangedObservable).pipe(
          takeUntil($controllerRemoved)
        ).subscribe((evt) => {
          config.hand_controller[axes_subject].next(evt);
        });
      }
    });


  }; // ends init

};

```

### Add System to Orchestrator and Test

Add the new system to the `orchestrator.ts` and initialize it like we always do.

We can test this in a desktop browser that has the WebXR emulator extension.  At the bottom of the init function add this:

```typescript
config.hand_controller.left_axes.subscribe((evt) => {
  console.log("left axes", evt);
});
```

When you move the joystick on the XR Web Emulator it will send events into the RxJS subject and flow through this test subscription.  In the js console you should see something like this:

```javascript
left axes {x: 0.08, y: 0.04}
left axes {x: 0.08, y: 0.04}
left axes {x: 0.28, y: 0.08}
left axes {x: 0.28, y: 0.08}
left axes {x: 0.96, y: 0.27}
left axes {x: 0.96, y: 0.27}
left axes {x: 0.98, y: 0.22}
```

We now have separate data streams for left and right button and joystick events.

### Create Data Stream for Hand Movement

Following the pattern of what we did for camera movement, we'll just send a stream of empty data when we detect movement.  This way the subscriber can throttle the frequency and truncate the output for themselves if they can get to it.  Otherwise we'll spend extra computation power truncating the data at the source which has more frequent samples.

On the `inputSource` there is an object called `grip` that seems to contain an observer we can use.

```typescript

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


```

Let's update Config to support the two extra properties:

```typescript
  hand_controller: {
    ...
    left_grip?: AbstractMesh;
    ...
    right_grip?: AbstractMesh;
  };
```