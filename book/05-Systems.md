
### Restructuring for Systems

So far we've just been dealing with a single file `app.ts` but that will become unwieldy soon.  

It would be good to split the code base up into managable files with each file responsible for some particular feature of our game room.  

Let's create a folder in `assets/js` called `systems`.  We will be adding more and more files to this `systems` folder.  Each file will handle one particular concern.

Our first system wil be called `broker.ts` and that system is responsible for connecting to the `RoomChannel` as we did previously.  Let's create another file called `scene.ts` that is responsible for creating an HTML canvas on the page to draw our 3D scene.  

We need a mechanism to share data between systems.  For example, the `broker.ts` system needs to know the room_id in order to join the channel.  The `scene.ts` will need to be able to share the `BABYLON.Scene` object that it creates with other systems that may need to interact with it.

#### Add config.ts

To solve this, let's create a file called `assets/js/config.ts` and define a type definition called `Config` that will contain some attribute variables that we need to share between systems.

```typescript
import type { Socket, Channel } from "phoenix"
import type { Scene } from "@babylonjs/core/scene"

export type Config = {
  room_id: string
  user_id: string
  scene: Scene
  socket: Socket
  channel: Channel
}

export const config: Config = {
  room_id: "",
  user_id: "",
  scene: null,
  socket: null
  channel: null
}
```

This file creates initializes and exports a `config` variable.  When other typescript files import this file they'll get access to the same `config` and can read or write to it.  Since we are using a strict type and not a regular javascript object we cannot add arbitrary new properties at will.  Anytime we feel the urge to add a new property to the config object we'll also need to add it to the Config type.  That may be a chore but the benefit is that we have type completion and intellisense will help remind us what common shared variables are available and warn us if we try to set a value on the config on a non-existant attribute.


#### Add broker.ts

Now let's create the `assets/js/systems/broker.ts`

```typescript
import { config } from "../config";

// channel connection
const socket = config.socket;
socket.connect();
let channel = socket.channel(`room:${config.room_id}`, {});
config.channel = channel;
channel.join()
  .receive("ok", resp => { console.log("Joined successfully", resp); })
  .receive("error", resp => { console.log("Unable to join", resp); });

channel.on("shout", payload => {
  console.log("I received a 'shout'", payload);
});

```

This should look familiar as it is just a port of the code we had before for joining a channel.  Except we are getting the socket and room_id from the config.  

#### Add scene.ts

Now create `assets/js/systems/scene.ts`.  This file will inject a 3D scene onto the page by creating a canvas.

```typescript
import { config } from "../config";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { Scene } from "@babylonjs/core/scene";

import { GridMaterial } from "@babylonjs/materials/grid/gridMaterial";
import "@babylonjs/core/Materials/standardMaterial";

// create the canvas html element and attach it to the webpage
const canvas = document.createElement("canvas");
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.id = "gameCanvas";
canvas.style.zIndex = "1"; // don't put this too high, it blocks the VR button
canvas.style.position = "absolute";
canvas.style.top = "0";
canvas.style.touchAction = "none";
canvas.style.outline = "none";
document.body.appendChild(canvas);

// initialize babylon scene and engine
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
config.scene = scene;
// This creates and positions a free camera (non-mesh)

// create a birds-eye-view pointed at the origin
const default_position = new Vector3(0, 15, 50);
const camera = new FreeCamera("my head", default_position, scene);

// This targets the camera to scene origin
camera.setTarget(Vector3.Zero());

// This attaches the camera to the canvas
camera.attachControl(canvas, true);
new HemisphericLight("light1", new Vector3(1, 1, 0), scene);

// Create a grid material
const material = new GridMaterial("grid", scene);

// Our built-in 'sphere' shape.
const sphere = CreateSphere("sphere1", { segments: 16, diameter: 2 }, scene);

// Move the sphere upward 1/2 its height
sphere.position.y = 2;

// Our built-in 'ground' shape.
const ground = CreateGround("ground1", { width: 100, height: 100, subdivisions: 2 }, scene);

// Affect a material
ground.material = material;

// hide/show the Inspector
window.addEventListener("keydown", async (ev) => {

  if (ev.ctrlKey && ev.key === 'b') {
    await import("@babylonjs/core/Debug/debugLayer");
    await import("@babylonjs/inspector");
    console.log("invoking the debug layer");
    if (scene.debugLayer.isVisible()) {
      scene.debugLayer.hide();
    } else {
      scene.debugLayer.show({ embedMode: true });
    }
  }
});

window.addEventListener("resize", function () {
  engine.resize();
});

// run the main render loop
engine.runRenderLoop(() => {
  scene.render();
});


```
The `scene.ts` contains typical Babylon.js getting started boilerplate to setup a canvas, engine, camera and scene.  It also includes a shortcut hotkey combo to open the inspector if we need to do some debugging (notice we use async imports in order to keep the bundle size smaller by taking advantage of esbuild's code splitting feature).  The scene is created in this file and then assigned to the `scene` key in the `config` object.  It's important that any systems that need to make use of `config.scene` be evaluated after `config.scene` is available.

#### Add systems.ts

To tie all the systems together, we need to import each system in the correct order.  Add this file `assets/js/systems.ts` to load each system we've made so far.

```typescript
import "./systems/broker";
import "./systems/scene";
```

Whenever we add a new system, we'll need to update the system.ts file or the new system won't be reachable.

Finally the system.ts file we just made must also be included in our entry point file or it also won't be reachable.

### Update app.ts

```typescript

window["initRoom"] = async (room_id: string, user_id: string) => {
  const { config } = await import("./config");
  config.room_id = room_id;
  config.user_id = user_id;
  config.socket = liveSocket;
  await import("./systems");
};
```
Remember that this `initRoom` function is only invoked by the `show.html.heex` template, so `config` and `systems`, which are dynamically imported will never be loaded by the browser except on the URL `rooms/:room_id`.

You should end up with a `assets/js` folder structure like this, setting us up to create more and more systems:

```
├── app.ts
├── config.ts
├── systems.ts
└── systems
    ├── broker.ts
    └── scene.ts
```


Open up your browser and navigate to a specific room URL and you should see a 3D scene now!  Our camera is also already integrated with the keyboard and mouse so you can travel around in the scene, by clicking and dragging your mouse and then using the cursor keys to move forward or backward.  To open up the Babylon.js inspector we've added a short-cut (CTRL-b), so that we can inspect the meshes in the scene.  


### Summary

In this chapter we started organizing our typescript files into systems.  Each system should be responsible for one aspect of our game.  We created two systems.  We created a broker system which is responsible for communicating with our Phoenix room channel.  We create a scene system which is responsible for rendering 3D graphics on the show room endpoint.  We created a `config` file to share variables between systems.  We then imported both systems into a `systems.ts` file.  We then modified our original `window.initRoom` function to dynamically import `config` and `systems`, and therefore only import those code split bundles on the show room endpoint.  

