## Customizing Camera Behavior

When we created the Babylon.js scene in the scene system, we created a Universal Camera and attached controls.

```typescript
const camera = new UniversalCamera("my head", default_position, scene);

// This attaches the camera to the canvas
camera.attachControl(canvas, true);
```

The default behavior of the controls is cursor keys is:
  - up arrow moves the camera forward.  If we're looking up we will head toward the sky.
  - down arrow moves the camera backward.
  - right arrow is a side-step to the right.
  - left arrow side-steps left.

The mouse behavior is if you click and drag, the camera moves toward the direction you dragged in.

### Define New Behavior

I would like to enable both the cursor keys and the WASD keys.  The cursor keys should behave like the game DOOM, so that left and right arrows will turn you instead of side step.  But if you still want to strafe left and right you can use the A and D keys.  The mouse should have an option to lock the mouse to the screen so whatever direction you pull your mouse toward your camera will turn that way.  However if not locked, then I want the mouse to behave like a touch pad in that you tap and drag to pull the scene toward you (opposite to the default.)

We would also like the camera to not pass through objects.  The camera should collide with objects and stop.


### Custom Camera Inputs

Let's tackle customizing the camera inputs first.

Here is a link to the Babylon.js documentation: https://doc.babylonjs.com/features/featuresDeepDive/cameras/customizingCameraInputs

We can add or remove camera inputs and we can create our own by implementing this interface:

```typescript
interface ICameraInput<TCamera extends BABYLON.Camera> {
  // the input manager will fill the parent camera
  camera: TCamera;

  //this function must return the class name of the camera, it could be used for serializing your scene
  getClassName(): string;

  //this function must return the simple name that will be injected in the input manager as short hand
  //for example "mouse" will turn into camera.inputs.attached.mouse
  getSimpleName(): string;

  //this function must activate your input, event if your input does not need a DOM element
  attachControl: (noPreventDefault?: boolean) => void;

  //detach control must deactivate your input and release all pointers, closures or event listeners
  detachControl: () => void;

  //this optional function will get called for each rendered frame, if you want to synchronize your input to rendering,
  //no need to use requestAnimationFrame. It's a good place for applying calculations if you have to
  checkInputs?: () => void;
}
```
Add a new file a `js/assets/inputs/walk.ts`

This class is enough to satisfy the interface:

```typescript

import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { ICameraInput } from "@babylonjs/core/Cameras/cameraInputsManager";

export class WalkInput implements ICameraInput<UniversalCamera> {

  camera: UniversalCamera;

  public getClassName(): string {
    return "WalkInput";
  }
  public getSimpleName(): string {
    return "walk";
  }

  public attachControl(noPreventDefault?: boolean): void {
    console.log(this);
  }


  public detachControl() { }


}
```


Let's try installing it when we create the camera.

Running this code in the console reveals which inputs are connected by default (config is available because I set it to the window object to debug):

```javascript
config.scene.activeCamera.inputs.attached

{keyboard: FreeCameraKeyboardMoveInput, mouse: FreeCameraMouseInput, touch: FreeCameraTouchInput, gamepad: FreeCameraGamepadInput}
```
Let's start by removing the keyboard and replacing it with our 'walk' class.

```typescript
camera.inputs.remove(camera.inputs.attached.keyboard);
camera.inputs.add(new WalkInput());
```

As expected our new input class doesn't move the camera at all when we press any keys.  Though the mouse still works because that input is still attached to the camera.

#### Define Keys To Listen To

Let's begin by making a list of keycodes that are meaningful to us:

```typescript

  UP_ARROW = 38;
  DOWN_ARROW = 40;
  RIGHT_ARROW = 39;
  LEFT_ARROW = 37;
  A_KEY = 65;
  D_KEY = 68;
  W_KEY = 87;
  S_KEY = 83;

```
We let's also make a testing function that takes a key code and returns true if any of these keys are pressed.  We also want to group some of these keys together because they are equivalent in intent.

```typescript
  keysForward = [this.UP_ARROW, this.W_KEY];
  keysBackward = [this.DOWN_ARROW, this.S_KEY];
  keysRotateRight = [this.RIGHT_ARROW];
  keysRotateLeft = [this.LEFT_ARROW];
  keysStrafeRight = [this.D_KEY];
  keysStrafeLeft = [this.A_KEY];

  myKeysMatched(keyCode: number): boolean {
    return this.keysForward.includes(keyCode) ||
      this.keysBackward.includes(keyCode) ||
      this.keysRotateRight.includes(keyCode) ||
      this.keysRotateLeft.includes(keyCode) ||
      this.keysStrafeLeft.includes(keyCode) ||
      this.keysStrafeRight.includes(keyCode);
  }

```

Now we can create a listener to listen for the pressed keys.  We can collect all valid key presses into any array, and if the key is released remove it from the array.

```typescript
  // stores unique keyCodes that are currently pressed
  keys: Set<number> = new Set();
```

 A good place to add the observeable is the attachControl, and then to clean up we can remove the observable in the detachControl function. 

 ```typescript
  keyboardObservable;

  public attachControl(noPreventDefault?: boolean): void {

    this.keyboardObservable = this.camera.getScene().onKeyboardObservable.add((kbInfo) => {
      const { type, event } = kbInfo;
      if (type === KeyboardEventTypes.KEYDOWN) {
        if (this.myKeysMatched(event.inputIndex)) {
          this.keys.add(event.inputIndex);
        }
        if (!noPreventDefault) {
          event.preventDefault();
        }
      } else {
        // keyup event
        if (this.myKeysMatched(event.inputIndex)) {
          this.keys.delete(event.inputIndex);
        }
        if (!noPreventDefault) {
          event.preventDefault();
        }
      }
    });
  }


  public detachControl() {
    this.camera.getScene().onKeyboardObservable.remove(this.keyboardObservable);
  }
```
Now we implement the optional function `checkInputs`.  Here's we're going to loop through every key code in `keys` array and update the camera.

Let's start with the non-rotating keys first.  These are forward, backward, side to side.  First we get the camera speed.

```typescript
const speed = camera._computeLocalCameraSpeed()
```
This appears to return a scalar value.  It's defined as this:

```typescript
public _computeLocalCameraSpeed(): number {
        var engine = this.getEngine();
        return this.speed * Math.sqrt((engine.getDeltaTime() / (engine.getFps() * 100.0)));
    }
```

It's aim is to smooth out the animation frame over frame in response to the variablity in framerate.

We then take the camera's current local direction and nudge it in the local axis relavant to the key being pressed.  For example the UP_ARROW or W_KEY represent going forward, which in local space is the Z axis.

```typescript
  // nudge z axis by amount speed, where speed is recalc'd every frame
  camera._localDirection.copyFromFloats(0, 0, speed);
```

Then we move the camera using this code:

Save a matrix to _cameraTransformMatrix
  
```typescript
  this.camera.getViewMatrix().invertToRef(this.camera._cameraTransformMatrix);
```

Take the `_localDirection` we just nudged and with respect to the camera's actual orientation in space, save the output to the camera's `_transformedDirection`

```typescript
  Vector3.TransformNormalToRef(this.camera._localDirection, this.camera._cameraTransformMatrix, this.camera._transformedDirection);
```

Finally, we take the temporarity variable _transformedDirection and apply it to `cameraDirection` and that really moves it.

```typescript

     this.camera.cameraDirection.addInPlace(this.camera._transformedDirection);
 
```

Then for rotation we just nudge cameraRotation a bit:

```typescript
camera.cameraRotation.y += speed * someMagnitude
```

Here is the full `walk.ts` code:

```typescript
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { ICameraInput } from "@babylonjs/core/Cameras/cameraInputsManager";
import { Vector3 } from "@babylonjs/core/Maths";
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";

export class WalkInput implements ICameraInput<UniversalCamera> {

  camera: UniversalCamera;
  keyboardObservable;
  rotationMagnitude = 0.1;

  UP_ARROW = 38;
  DOWN_ARROW = 40;
  RIGHT_ARROW = 39;
  LEFT_ARROW = 37;
  A_KEY = 65;
  D_KEY = 68;
  W_KEY = 87;
  S_KEY = 83;

  keysForward = [this.UP_ARROW, this.W_KEY];
  keysBackward = [this.DOWN_ARROW, this.S_KEY];
  keysRotateRight = [this.RIGHT_ARROW];
  keysRotateLeft = [this.LEFT_ARROW];
  keysStrafeRight = [this.D_KEY];
  keysStrafeLeft = [this.A_KEY];

  myKeysMatched(keyCode: number): boolean {
    return this.keysForward.includes(keyCode) ||
      this.keysBackward.includes(keyCode) ||
      this.keysRotateRight.includes(keyCode) ||
      this.keysRotateLeft.includes(keyCode) ||
      this.keysStrafeLeft.includes(keyCode) ||
      this.keysStrafeRight.includes(keyCode);
  }

  // stores unique keyCodes that are currently pressed
  keys: Set<number> = new Set();

  public getClassName(): string {
    return "WalkInput";
  }
  public getSimpleName(): string {
    return "walk";
  }

  public attachControl(noPreventDefault?: boolean): void {

    this.keyboardObservable = this.camera.getScene().onKeyboardObservable.add((kbInfo) => {
      const { type, event } = kbInfo;
      if (type === KeyboardEventTypes.KEYDOWN) {
        if (this.myKeysMatched(event.inputIndex)) {
          this.keys.add(event.inputIndex);
        }
        if (!noPreventDefault) {
          event.preventDefault();
        }
      } else {
        // keyup event
        if (this.myKeysMatched(event.inputIndex)) {
          this.keys.delete(event.inputIndex);
        }
        if (!noPreventDefault) {
          event.preventDefault();
        }
      }
    });
  }


  public detachControl() {
    this.camera.getScene().onKeyboardObservable.remove(this.keyboardObservable);
  }

  public checkInputs() {
    let camera = this.camera;

    // modify the camera influence using every valid keyboard movement press
    camera._localDirection.copyFromFloats(0, 0, 0);
    for (const keyCode of this.keys) {

      let speed = camera._computeLocalCameraSpeed();

      if (this.keysForward.includes(keyCode)) {
        camera._localDirection.z += speed;
      } else if (this.keysBackward.includes(keyCode)) {
        camera._localDirection.z -= speed;
      } else if (this.keysStrafeLeft.includes(keyCode)) {
        camera._localDirection.x -= speed;
      } else if (this.keysStrafeRight.includes(keyCode)) {
        camera._localDirection.x += speed;
      } else if (this.keysRotateRight.includes(keyCode)) {
        camera.cameraRotation.y += speed * this.rotationMagnitude;
      } else if (this.keysRotateLeft.includes(keyCode)) {
        camera.cameraRotation.y -= speed * this.rotationMagnitude;

      }
      this.updateCamera();
    }

  }

  updateCamera() {
    this.camera.getViewMatrix().invertToRef(this.camera._cameraTransformMatrix);
    Vector3.TransformNormalToRef(this.camera._localDirection, this.camera._cameraTransformMatrix, this.camera._transformedDirection);
    this.camera.cameraDirection.addInPlace(this.camera._transformedDirection);
  }


}
```

Now we have a camera keyboard movement that works similarly to before but we can use WASD keys and we can use the cursor keys.

Next let's work on making it so that the camera doesn't pass through objects and stays on the ground.  One approach to staying on top of objects and not fly into space is to apply some gravity to the scene.  That way when our keyboard input is still sending us off in the direction we're facing, gravity is bringing us back down.

Babylon's mechanism to prevent us from falling through the floor and passing through other objects is with the `checkCollisions` flag on the camera and on any meshes that the camera might run into.  First enable gravity and collisions on the scene, then set up an ellipsoid on the camera.  Think of an ellipsoid as an invisible shield around the Enterprise in StarTrek the Next Generation.

```typescript


scene.gravity = new Vector3(0, -9.81, 0);
scene.collisionsEnabled = true;
...

camera.ellipsoid = new BABYLON.Vector3(0.25, 0.1, 0.25);
camera.checkCollisions = true;
camera.applyGravity = true;

  ...
box.checkCollissions = true;
```

We can make the changes to the scene and the camera in the `scene.ts` system file.  Then for every obstacles we are creating in the `mesh_builder.ts` system we can also set the checkCollissions to be true.

The floor is currently not created by mesh builder, it's still hardcoded by `scene.ts`.  The ground mesh also needs to check collisions otherwise the gravity will make us floor through the floor forever.  Let's port that over to `mesh_builder` system so it can be created with a collission detector the same way our boxes get it automaticallh now.  We'll generate an entity for that on the back end in the database just like we do the random colored boxes.

In the backend in `rooms.ex` add a ground entity through `mesh_builder` component.

```elixir

  def create_floor(room_id) do
    create_entity(room_id, Xr.Utils.random_string(), %{
      "mesh_builder" => ["ground", %{"width" => 100, "height" => 100, "subdivisions" => 2}],
      "position" => [0, 0, 0],
      "material" => "grid"
    })
  end

  def generate_random_content(room_id) do
    # create a ground
    create_floor(room_id)
    # pick a random color
    ...
```

All new rooms created will get exactly one entity that is a floor.  We also added a material component to keep that grid texture on it for now.

In the front end we need to create and use a new material system, then modify the mesh_builder system to account for "ground" values.

Update file `assets/js/systems/mesh_builder.ts`:

```typescript
 ...

  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.create)),
    filter(componentExists("mesh_builder")),
  ).subscribe((evt) => {
    const value = evt.com["mesh_builder"];
    const [mesh_type, mesh_args] = value;
    let mesh;
    switch(mesh_type) {
      case "box":
        mesh = CreateBox(evt.eid, mesh_args, scene);
        break;
      case "ground":
        mesh = CreateGround(evt.eid, mesh_args, scene);
        break;
    }
    mesh.checkCollisions = true;

  });
```

Add file `assets/js/systems/material.ts`

```typescript
import { StateOperation, componentExists, Config } from "../config";
import { filter } from "rxjs/operators";
import { GridMaterial } from "@babylonjs/materials/grid/gridMaterial";
import "@babylonjs/core/Materials/standardMaterial";

export const init = (config: Config) => {


  const { scene, $state_mutations } = config;

  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.create)),
    filter(componentExists("material")),
  ).subscribe((evt) => {
    const value = evt.com["material"];
    const mesh = scene.getMeshByName(evt.eid);
    if (!mesh) {
      return
    }
    if (value === "grid") {

      // Create a grid material
      const material = new GridMaterial("grid", scene);
      mesh.material = material;
    }

  });

};
```

REMOVE these lines from `scene.ts`, because they are now handled by mesh_builder and material system:

```typescript
// Create a grid material
const material = new GridMaterial("grid", scene);

...
// Our built-in 'ground' shape.
const ground = CreateGround("ground1", { width: 100, height: 100, subdivisions: 2 }, scene);

// Affect a material
ground.material = material;
ground.checkCollisions = true;
```

Remember to import and initialize the material system in orchestrator.ts.

```typescript

...

import * as Material from "./systems/material";

...
        Material.init(config);
...
        
```

Now our ground is no longer hard-coded by the scene but is provided by a mesh_builder component and has the check collision boolean set.

Give this a try in your browser and you should see that we can no longer pass through boxes and we stay on the ground.  However when we get up very close to objects they disappear.  This is because of the clipping plane of the camera.  Let's adjust that along with some other fine tuning:

```typescript
    camera.minZ = 0.05;
```

With this last change we can bump up against boxes and still see the box we're bumping up against.

### Summary

In this chapter we customized the keyboard input for the camera.  We also added collision checking and gravity so the camera stays on the ground surface and cannot penetrate meshes that we created in the mesh_builder system.  We ported the hard-coded ground that was in scene.ts into the mesh_builder system and we created a new material system to handle putting a grid texture on the floor.


