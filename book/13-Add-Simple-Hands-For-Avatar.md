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
    left_moved: Subject<number[]>;
    right_button: Subject<XRButtonChange>;
    right_axes: Subject<{ x: number; y: number; }>;
    right_moved: Subject<number[]>;
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

  }; 
};

```

### Add System to Orchestrator and Test

Add the new system to the `orchestrator.ts` and initialize it like we always do.

We can test this in a desktop browser that has the WebXR emulator extension.  At the bottom of the init function add this little test subscription so we can see data being output (we'll remove it right after we confirmed it works):

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

At this point we now have separate data streams for left and right button and joystick events.

### Create Data Stream for Hand Movement

Let's also create a stream of movement for the left and right hand controllers.
The `inputSource` has an object called `grip` that seems to contain an observer we can use `onAfterWorldMatrixUpdateObservable`.  Unlike the camera's `onViewMatrixChangedObservable`, which does not emit anything when the camera is at rest, the `onAfterWorldMatrixUpdateObservable` appears to get called on every frame regardless if the position changed.  That's ok, we'll just transform the signal a bit so we only produce a signal if the position changes.

```typescript

  const observe_motion = (input_source: WebXRInputSource, $controller_removed: Observable<WebXRInputSource>) => {
    const handedness = input_source.inputSource.handedness;
    const movement_bus = `${handedness}_moved`;

    input_source.onMeshLoadedObservable.addOnce(() => {
      // grip should be available

      config.hand_controller[`${handedness}_grip`] = input_source.grip;
      fromBabylonObservable(input_source.grip.onAfterWorldMatrixUpdateObservable).pipe(
        takeUntil($controller_removed),
        map(data => truncate(data.position.asArray(), 3)), // remove excessive significant digits
        scan((acc, data) => {
          const new_sum = data.reduce((a, el) => a + el, 0); // compute running delta between position samples
          return { diff: new_sum - acc.sum, sum: new_sum, data };
        }, { diff: 9999, sum: 0, data: [0, 0, 0] }),
        filter(result => Math.abs(result.diff) > 0.001), // if difference is big enough
        map(result => result.data)
      ).subscribe((pos: number[]) => {
        config.hand_controller[movement_bus].next(pos);
      });

    });

  };

```
This movement detector gets a TransformNode on every frame.  It pulls the position data from the TransformNode and sends that down the pipe justing RxJS map operator.  Then we use an RxJS scan operator to fold in some state.  We pass in an accumulator with a data field to preserve the position array, a sum field to remember the previous sum, and a diff field to calculate the difference between the previous sample.  In the next pipeline operator we use a filter to only allow samples through that had a diff > 0.001.  Finally we use map to remove the extra fields we created on the payload and return just the position array again.

Add this function after the previous component setup function we created:

```typescript
input_source.onMotionControllerInitObservable.addOnce(mc => {
  mc.onModelLoadedObservable.addOnce(() => {
    observe_components(input_source, $controller_removed);
    /* add it here */
    observe_motion(input_source, $controller_removed);
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

By exposing the grip on the config, we can pull other information off of it later, such as rotation.

Now let's combine all the signals for head and each hand movement and send it out to the RoomChannel via the "i_moved" event.  We were doing this in avatar.ts.  Update the function like so:

```typescript

$channel_joined.pipe(take(1)).subscribe(() => {

    const head_pos_rot = () => {
      const cam = scene.activeCamera;
      const position = truncate(cam.position.asArray());
      const rotation = truncate(cam.absoluteRotation.asArray());
      return position.concat(rotation);
    };

    const pose = { head: head_pos_rot(), left: null, right: null };

    config.hand_controller.left_moved.subscribe(left_pos => {
      const rot = truncate(config.hand_controller.left_grip.rotationQuaternion.asArray());
      pose.left = left_pos.concat(rot);
    });

    config.hand_controller.right_moved.subscribe(right_pos => {
      const rot = truncate(config.hand_controller.right_grip.rotationQuaternion.asArray());
      pose.right = right_pos.concat(rot);
    });

    config.$camera_moved.subscribe(() => {
      pose.head = head_pos_rot();
    });

    config.$xr_exited.subscribe(() => {
      pose.left = null;
      pose.right = null;
    });

    $camera_moved.pipe(mergeWith(config.hand_controller.left_moved, config.hand_controller.right_moved)).pipe(
      throttleTime(MOVEMENT_SYNC_FREQ),
    ).subscribe(() => {
      channel.push("i_moved", { pose });
    });

  });
  ```

To combine the head and hands we first create a `pose` staging area.  We always have a head position and rotation so we write function to grab that from the current active camera.  Then we create 3 subscriptions, one for each hand and one for head movement to update the `pose` with position and rotation when there is any movement.  If we leave xr we'll set the left and right hand data to null on the `pose`.  Finally we create a subscription based on all three movements and send the combined `pose` but throttled by time.

Now let's improve the `createSimpleUser` function in `avatar.ts` to render boxes for hands.

```typescript

  
  const headId = (user_id: string) => `head_${user_id}`;
  
  // add some functions for getting the mesh for left and right boxe names
  const leftId = (user_id: string) => `left_${user_id}`;
  const rightId = (user_id: string) => `right_${user_id}`;

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

In this chapter we added simple box hands to our simple box head "avatar".  To grab the data for the hand controllers we set up some more RxJS subjects to stream the data to.  Then we pushed that data to the room channel.  Since we already have in place a pipeline to get that data and draw an avatar, we just extended that function to also create and render box hands.