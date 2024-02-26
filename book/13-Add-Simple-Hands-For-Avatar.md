## Add Simple Hands To Avatar




Now we'll subscribe to signals to turn on and off the sending of our XR camera and hand controller movement.  Considering that the user is able to enter and exit immersive-vr session at will we should take care to register and de-register subscriptions accordingly so that we don't create more and more subscriptions accidentally when we repeatedly enter and exit XR.  It's useful to use RxJS observers for this.  Here is a function that converts a Babylon.js observable into an RxJS Observable.

```typescript

/**
 * Wraps a Babylon Observable into an rxjs Observable
 *
 * @param bjsObservable The Babylon Observable you want to observe
 * @example
 * ```
 * import { Engine, Scene, AbstractMesh } from '@babylonjs/core'
 *
 * const canvas = document.getElementById('canvas') as HTMLCanvasElement
 * const engine = new Engine(canvas)
 * const scene = new Scene(engine)
 *
 * const render$: Observable<Scene> = fromBabylonObservable(scene.onAfterRenderObservable)
 * const onMeshAdded$: Observable<AbstractMesh> = fromBabylonObservable(scene.onNewMeshAddedObservable)
 * ```
 */
export function fromBabylonObservable<T>(
  bjsObservable: BabylonObservable<T>
): RxJsObservable<T> {
  return new RxJsObservable<T>((subscriber) => {
    if (!(bjsObservable instanceof BabylonObservable)) {
      throw new TypeError("the object passed in must be a Babylon Observable");
    }

    const handler = bjsObservable.add((v) => subscriber.next(v));

    return () => bjsObservable.remove(handler);
  });
}
```

This code snippet above came from the Babylon.js forums and documentation.  It allows us to use RxJS semanics for unsubscribing.  We'll use it to subscribe to an XRFrame event whenever we enterXR, and unsubscribe whenever we exit XR.  Within each frame we'll grab the camera and hand positions and send them to the RoomChannel in the form of an `i_moved` event.


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
  $xr_button_changes: Subject<XRButtonChange>;
  $xr_axes: Subject<{ x: number; y: number; handedness: "left" | "right" | "none"; }>;
  
}

// values are only populated if they have changed from their previous value
export type XRButtonChange = {
  handedness: "left" | "right" | "none";
  id: string; // component id (examples: "x-standard-thumbstick", "xr-standard-trigger", "b-button", "a-button", etc.)
  type: "trigger" | "squeeze" | "thumbstick" | "button" | "touchpad";
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

```

### Add System to Orchestrator 

Add the new system to the `orchestrator.ts` and initialize it like we always do.

At this point we now have separate data streams for all buttons (including squeeze and trigger) and joystick events.

### Share XR head and hand movement

Now we want to share our xr hand and hand positions and rotation with others.  First let's stash the left and right "grip" meshes that are created by Babylon.js somewhere so that we can pull the position and rotation off of them.

Add this function after the previous component setup function we created:

```typescript
input_source.onMotionControllerInitObservable.addOnce(mc => {
  mc.onModelLoadedObservable.addOnce(() => {
    observe_components(input_source, $controller_removed);
    /* add it here */
    input_source.onMeshLoadedObservable.addOnce(() => {
      config.hand_controller[`${handedness}_grip`] = input_source.grip;
    });
  });
});
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

Now let's combine a payload for head and each hand movement and send it out to the RoomChannel via the "i_moved" event.  We were doing this in avatar.ts.  

Add this snippet to the init function in avatar.ts

```typescript

  $xr_entered.subscribe(async () => {
    const xr_camera = scene.activeCamera as UniversalCamera;
    fromBabylonObservable(
      xr_helper.baseExperience.sessionManager.onXRFrameObservable
    )
      .pipe(
        takeUntil($xr_exited),
        throttleTime(MOVEMENT_SYNC_FREQ),
        scan(
          (acc, _frame) => {
            acc.prev = { ...acc.curr };
            acc.curr.head = head_pos_rot(xr_camera);
            if (config.hand_controller.left_grip) {
              acc.curr.left = hand_pos_rot(config.hand_controller.left_grip);
            }
            if (config.hand_controller.right_grip) {
              acc.curr.right = hand_pos_rot(config.hand_controller.right_grip);
            }
            return acc;
          },
          {
            prev: {
              head: [0, 0, 0, 0, 0, 0, 1],
              left: [0, 0, 0, 0, 0, 0, 1],
              right: [0, 0, 0, 0, 0, 0, 1],
            },
            curr: {
              head: [0, 0, 0, 0, 0, 0, 1],
              left: [0, 0, 0, 0, 0, 0, 1],
              right: [0, 0, 0, 0, 0, 0, 1],
            },
          }
        ),
        filter(
          ({ prev, curr }) =>
            prev.head[0] !== curr.head[0] ||
            prev.left[0] !== curr.left[0] ||
            prev.right[0] !== curr.right[0] ||
            prev.left[1] !== curr.left[1] ||
            prev.right[1] !== curr.right[1] ||
            prev.left[2] !== curr.left[2] ||
            prev.right[2] !== curr.right[2]
        ),
        map(({ curr }) => curr)
      )
      .subscribe((pose) => {
        channel.push("i_moved", { pose });
      });
  });

```

First we listen to the xr_entered event.  Within that subscription we create a new subscription for every xr frame, but will unsubscribe when we receive an xr_exited event.  For every frame we will throttle by time so we only sample once every MOVEMENT_SYNC_FREQ.  Then we use `scan` to create a state in our pipeline that enables us to stage a payload of { head, left, right } position and rotation arrays.  We further keep a `prev` and `curr` version of those payloads so that we may drop any payloads if there is no change between payloads.  Finally we reshape the data in the pipeline to just the `curr` version and push it out on the channel.

### Render box hands for avatars

Now let's improve the `createSimpleUser` function in `avatar.ts` to render boxes for hands.

```typescript

  
  const headId = (user_id: string) => `${user_id}:head`;
  // add additional functions for getting left and right mesh names
  const leftId = (user_id: string) => `${user_id}:left`;
  const rightId = (user_id: string) => `${user_id}:right`;

  ....

  const createSimpleUser = (user_id: string, pose: { head: number[]; left?: number[]; right?: number[]; }) => {

    let head = cache.get(headId(user_id));
    if (!head) {
      head = CreateBox(headId(user_id), { width: 0.15, height: 0.3, depth: 0.25 }, scene);
      cache.set(headId(user_id), head);

    }
    let left = cache.get(leftId(user_id));
    if (!left) {
      left = CreateBox(leftId(user_id), { width: 0.1, height: 0.1, depth: 0.2 }, scene);
      cache.set(leftId(user_id), left);
    }
    let right = cache.get(rightId(user_id));
    if (!right) {
      right = CreateBox(rightId(user_id), { width: 0.1, height: 0.1, depth: 0.2 }, scene);
      cache.set(rightId(user_id), right);
    }

    poseUser(user_id, pose);

  };

```
And update the poseUser function to handle moving hands to new locations

```typescript

  const poseUser = (user_id: string, pose: { head: number[]; left?: number[]; right?: number[]; }) => {

    const head = cache.get(headId(user_id));
    if (head) {
      //position is first 3 elements of pose array
      const position = pose.head.slice(0, 3);
      //rotation is last 4 elements of pose array
      const rotation = pose.head.slice(3);
      head.position.fromArray(position);
      if (!head.rotationQuaternion) {
        head.rotationQuaternion = Quaternion.FromArray(rotation);
      } else {
        head.rotationQuaternion.x = rotation[0];
        head.rotationQuaternion.y = rotation[1];
        head.rotationQuaternion.z = rotation[2];
        head.rotationQuaternion.w = rotation[3];
      }
    }

    if (pose.left) {
      const left = cache.get(leftId(user_id));
      if (left) {
        const position = pose.left.slice(0, 3);
        const rotation = pose.left.slice(3);
        left.position.fromArray(position);
        if (!left.rotationQuaternion) {
          left.rotationQuaternion = Quaternion.FromArray(rotation);
        } else {
          left.rotationQuaternion.x = rotation[0];
          left.rotationQuaternion.y = rotation[1];
          left.rotationQuaternion.z = rotation[2];
          left.rotationQuaternion.w = rotation[3];
        }
      }
    }

    if (pose.right) {
      const right = cache.get(rightId(user_id));
      if (right) {
        const position = pose.right.slice(0, 3);
        const rotation = pose.right.slice(3);
        right.position.fromArray(position);
        if (!right.rotationQuaternion) {
          right.rotationQuaternion = Quaternion.FromArray(rotation);
        } else {
          right.rotationQuaternion.x = rotation[0];
          right.rotationQuaternion.y = rotation[1];
          right.rotationQuaternion.z = rotation[2];
          right.rotationQuaternion.w = rotation[3];
        }
      }
    }


  };

```

While we're at it update function that would delete a user if they left:

```typescript

  const removeUser = (user_id: string) => {
    const head = cache.get(headId(user_id));
    if (head) {
      head.dispose();
      cache.delete(headId(user_id));
    }
    const left = cache.get(leftId(user_id));
    if (left) {
      left.dispose();
      cache.delete(leftId(user_id));
    }
    const right = cache.get(rightId(user_id));
    if (right) {
      right.dispose();
      cache.delete(rightId(user_id));
    }
  };

```

Test it, jump into a headset and wave your arms around.  If you have your desktop computer in front of you as well you can observe your headset "self" on the desktop while peaking under the headset.  You should see three colorless boxes representing head and hands.

### Summary

In this chapter we added simple box hands to our simple box head "avatar".  To grab the data for the hand controllers we set up some more RxJS subjects to stream the data to.  Then we pushed that movement data to the room channel.  Since we already have in place a pipeline to get that data and draw an avatar, we just extended that function to also create and render box hands.