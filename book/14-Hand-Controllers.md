## Add Ability To Subscribe To Hand Controller Components

Now that we're able to jump into immersive-vr we can see the world with 6 degrees of freedom in the headset.  But we have some more work to do to allow others to see our head and hands.  We'll need to add the ability to get the positions and rotations of each hand.  We'll also need the ability to listen for what buttons, triggers or squeezes the user is executing on the hand controllers.  In this section we'll dive into obtaining all this useful information, then emitting user movement that includes both hands, then finally reacting to that on the receiving side by drawing boxes for hands.

### Convert Babylon Observers to RxJS Observers

We'll begin by setting up more RxJS Observers which are useful for all kinds of signal processing.  Babylon.js provides observers for whenever hand controllers are added.  We can take advantage of those observers to run our code which will constantly listen for movement or button pushes etc.  Considering that the user is able to enter and exit immersive-vr session at will we should take care to register and de-register subscriptions accordingly so that we don't create more and more subscriptions accidentally when we repeatedly enter and exit XR.  It's useful to use RxJS observers for this.  Here is a function that converts a Babylon.js observable into an RxJS Observable.

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

This code snippet above came from the Babylon.js forums (and was later added to their official documentation).  It allows us to use RxJS observables so we can take advantage of RxJS pipes/filters etc.  We'll use it to subscribe to an XRFrame event whenever we enterXR, and unsubscribe whenever we exit XR.  Within each frame we'll grab the camera and hand positions and send them to the RoomChannel in the form of an `i_moved` event.


### Create xr-hand-controller system

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
        observe_components(input_source, $controllerRemoved);
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
    config.hand_controller[`${handedness}_grip`] = input_source.grip;
    observe_components(input_source, $controller_removed);
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

### Avatar system shall send head and hands position and rotation

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
            // there is some difference between prev and curr
            prev.head[0] !== curr.head[0] ||
            prev.left[0] !== curr.left[0] ||
            prev.right[0] !== curr.right[0] ||
            prev.left[1] !== curr.left[1] ||
            prev.right[1] !== curr.right[1] ||
            prev.left[2] !== curr.left[2] ||
            prev.right[2] !== curr.right[2]
        ),
        filter(
          ({ prev, curr }) =>
            // all three positions have come online, e.g. not the default dummy positions
            curr.head[0] !== 0 &&
            curr.left[0] !== 0 &&
            curr.right[0] !== 0
        ),
        map(({ curr }) => curr)
      )
      .subscribe((pose) => {
        channel.push("i_moved", { pose });
      });
  });

```

First we listen to the xr_entered event.  Within that subscription we create a new subscription for every xr frame, but will unsubscribe when we receive an xr_exited event.  For every frame we will throttle by time so we only sample once every MOVEMENT_SYNC_FREQ.  Then we use `scan` to create a state in our pipeline that enables us to stage a payload of { head, left, right } position and rotation arrays.  We initialize the scan with default values for the head and hands like [0,0,0,0,0,0,1].  The first 3 zeros are for position and the last 4 digits are for zero rotations expressed as a quaternion.  This is just a dummy position and rotation so we can avoid dealing with null values.  But we should never send this value out because they should be overwritten as soon as the hand controllers become available over the next few frames.  We further keep a `prev` and `curr` version of those payloads so that we may filter out any payloads if there is no change between payloads.  Finally we reshape the data in the pipeline to just the `curr` version and push it out on the channel.

### Render box hands for avatars

Now let's improve the `createSimpleUser` function in `avatar.ts` to render boxes for hands.  The incoming message we get on $state_mutation Subject concerns a single entity that is also the user_id.  But for now, we'll break this into 3 independement meshes named like `${user_id}:head`, `${user_id}:left` and `${user_id}:right`.

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

The createSimpleUser function will keep a cache so we can quickly get to these messages to update them.  If the head, left box or right box does not exist in the cache it will create them.

After all 3 meshes are created we call poseUser function to moving meshes to the current locations.

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

The poseUser function is meant to handle the case where the user has dropped out of xr and returned to 2D mode.  In that case we still get user movement data but it will not include left and right hands.  The poseUser function converts the array of numbers into position Vector3 and rotation Quaternion and updates the avatar meshes accordingly. 

Finally we dispose of the avatar mesh parts and delete the cache if the user leaves the room.

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

With these function in place two users that have entered the room should be able to see each other's "head" and "hand" boxes.  To test this, I usually sit in front of my desktop computer with my headset high up on my forehead while I peak at my screen from beneath the headset.  Then I enter the room on both the browser on my desktop as well as the browser in the headset.  Then I'll grab my controllers and move them up and down and peak at the browser on the desktop looking at the avatar of my headset.  Try this out.  You should be able to see your headset avatars hands move as you move your controllers around.

### Viewing Your Own Avatar

The default babylon.js xr experience helper detects what kind of headset we're wearing and loads hand controllers that look like the Quest product.  That's not what other's see, since our avatar system is just rendering a box for each hand.  If we want to see what others see, we should hide the Quest controllers and see our boxes for hands.  We also want to make sure our boxes for hands move immediately when we move, and not be subject to the network delays of waiting for the server to tell us where our hands were previously.

To hide the default mesh controllers at this in the xr-experience.ts when we construct the helper.

In xr-experience.ts:

```typescript
const xr_helper = await scene.createDefaultXRExperienceAsync({
      inputOptions: {
        doNotLoadControllerMeshes: true
      }
    });
```

Then to see our boxes move as quickly as our controllers are moving, let's parent the box hands to the grip as soon as the controllers are ready.  

In xr-hand-controller.ts:

```typescript

input_source.onMotionControllerInitObservable.addOnce(mc => {
  config.hand_controller[`${handedness}_grip`] = input_source.grip;

  observe_components(input_source, $controller_removed);
  // parent avatar hand to the grip
  const hand_mesh = config.scene.getMeshByName(`${config.user_id}:${handedness}`);
  if (hand_mesh) {
    hand_mesh.position.copyFromFloats(0, 0, 0);
    if (hand_mesh.rotationQuaternion) {
      hand_mesh.rotationQuaternion.copyFromFloats(0, 0, 0, 1);
    } else {
      hand_mesh.rotationQuaternion = new Quaternion(0, 0, 0, 1);
    }
    hand_mesh.parent = input_source.grip;
  }

});
```

### Summary

In this chapter we added simple box hands to our simple box head "avatar".  To grab the data for the hand controllers we set up some more RxJS observables based off of Babylon.js observables.  We constructed a combined payload of head and hand movement and sent that to the RoomChannel.  That data comes back to the front-end in the form of an entities_diff event which we handle in the avatar.ts system.  We modified the avatar system to handle drawing some hands.  Finally we also draw and update our own avatar hands, but we don't listen to entity updates for ourselves because our headset framerate is much higher than the updates we get from the server.  Instead we parent our box hands to the controller grip meshes.