
### Restructuring for Systems

So far we've just been dealing with a single file `app.ts` but that will become unwieldy soon.  

It would be good to split the code base up into managable files with each file responsible for some particular feature of our game room.  

Let's create a folder in `assets/js` called `systems`.  We will be adding more and more files to this `systems` folder.  Each file will handle one particular concern. The systems concept is lightly influenced by the Entity-Component-System architecture where systems are code which update the scene based on the component data for each entity.  E.g., lighting system, physics system, door system, audio system, etc etc.

We'll define each system as a file with a function that takes a config object:

```typescript

export const init = (config) => {
  // subscribe to events
  // modify the scene 
}
```

The config object will be a resource the system can use to obtain and share data with other components while remaining decoupled from them.  No system will import or reference another system.  The config object will contain any variables the system needs and will also contain a message bus for systems to push data to any interested subscribers.

All systems will be initialized by an orchestrator, that imports all the systems.  The orchestrator will create the config object and call each system's init function.

```typescript
import * as my_system from "./systems/my_system"
import * as second_system from "./systems/second_system"

const orchestrator = {
  init: (opts) => {
    const config = { ... opts }
    my_system.init(config)
    second_system.init(config)
  }
}

// call orchestrator init
orchestrator.init( /* seed with variables from server */)
```

The order in which the systems are initialized is important because the earlier systems may populate attributes in the config that the latter systems depend on.  Any subscriptions created in the system are also order dependent.

Finally, we need to include orchestrator in our bundler entry point so that the code will run.  Currently, if the code is not imported into app.ts or imported within any descendants of those imports, then the code is not "reachable".  If we import orchestrator directly into app.ts that would inflat our bundled app.js file size for every page on the website, even those pages that don't need Babylon.js.  Instead, we should split the code up so that we only bring in the hefty bundles of js when it is necessary.

All we need to do is create an another bundle just for orchestrator and only include it when we're on the show room URL.  

#### Create 2nd Entry Point for Orchestrator

Open up `build.js` our custom esbuild script and add another entry point:

```javascript
let opts = {
  entryPoints: ["js/app.ts", "js/orchestrator.ts"],
  bundle: true,
```

#### Create Orchestrator

Now let's create a barebones orchestrator file at "assets/js/orchestrator.ts"

```typescript

export const orchestrator = {
    init: () => {
        
    }
}
```

#### Add Orchestrator to the Root Layout

In `root.html.heex` add the following immediately following the line for app.js:

```elixir
<%= if assigns[:orchestrator] do %>
<script defer phx-track-static type="module" src={~p"/assets/orchestrator.js"}></script>
<% end %>
```
This line conditionally includes the script table for our bundled orchestrator.js file if and only if `assigns[:orchestrator]` evaluates to true.

#### Add Orchestrator Flag 

Let's add that orchestrator true flag into the assigns in the room's show function.  Open up `room_controller.ex` and update the render line to include the flag:

```elixir
render(conn, :show, orchestrator: true, room: room)
```

With the flag in place you can visit some pages and inspect the source code of the page.  We'll only be including the orchestrator.js on the room/:room_id url.  We're still keeping `app.js` on every page.  It creates the liveview socket, we'll add it to the window object so that we can access it on the orchestrator.js side.

#### Pass Variables To Frontend

Open up the room's `show.html.heex` and replace it with:

```html
<script>
  window["room_vars"] = <%= raw Jason.encode!(%{room_id: @room.id, user_id: @user_id}) %>
</script>
<body>
  <style>
    html, body {
      overflow: hidden;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: radial-gradient(ellipse at top, #201111, transparent),
              radial-gradient(ellipse at bottom, #000021, transparent);
    }
  </style>
</body>
```

This will share some variables such as the room_id and user_id with the frontend by making them available in `room_vars` object.  We also added a bit of styling to the body so that we fill the screen.

#### Config

Now let's define the Config object that each system will be initialized with.

Create a file called `assets/js/config.ts` and define a type definition called `Config` that will contain some attribute variables that we need to share between systems.

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

```

Since every system will be initialized with the same config object, every system will have access and can read or write to it.  

#### Add Broker

Let's make a system called broker out of our previous channel join logic.  Broker will be responsible for connecting to the channel.

Create file `assets/js/systems/broker.ts`

```typescript
import { Config } from "../config";

export const init = (config: Config) => {
  
  // channel connection
  const socket = config.socket;
  socket.connect();
  let channel = socket.channel(`room:${config.room_id}`, {});
  config.channel = channel;

  channel
    .join()
    .receive("ok", (resp) => {
      console.log("Joined successfully", resp);
      config.$channel_joined.next(true);
    })
    .receive("error", (resp) => {
      console.log("Unable to join", resp);
    });
   
}

```

This should look familiar as it is just a port of the code we had before for joining a channel.  The main difference is that we are now getting the socket and room_id from the config object. 

#### Clean up app.ts

Remember to remove the previous channel connection stuff we added as a temporary experiement on app.ts.  It is no longer needed.

#### Add scene.ts

Now create `assets/js/systems/scene.ts`.  This file will inject a 3D scene onto the page by creating a canvas.

```typescript

import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { Scene } from "@babylonjs/core/scene";
import { Config } from "../config";
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

export const init = (config: Config) => {
  config.scene = scene;
}
```
The `scene.ts` contains typical Babylon.js getting started boilerplate to setup a canvas, engine, camera and scene.  It also includes a shortcut hotkey combo to open the inspector if we need to do some debugging (notice we use async imports in order to keep the bundle size smaller by taking advantage of esbuild's code splitting feature).  The scene is created in this file and then assigned to the `scene` key in the `config` object.  It's important that any systems that need to make use of `config.scene` be evaluated after `config.scene` is available.

#### Add Systems To Orchestrator

To tie all the systems together, we need to import each system into orchestrator.  Orchestrator's init function will also create the config object and pass it into every system's init function.

```typescript
import * as Scene from "./systems/scene";
import * as Broker from "./systems/broker";
import { Config } from "./config";
import type { Socket } from "phoenix";

export const orchestrator = {
    init: (opts: { socket: Socket, room_id: string, user_id: string }) => {
        const config: Config = {
          room_id: opts.room_id,
          user_id: opts.user_id,
          scene: null,
          socket: opts.socket,
          channel: null
        }
        
        // debug
        window["config"] = config

        // initialize systems, order matters
        Scene.init(config)
        Broker.init(config)
        
    }
}

const socket = window["liveSocket"]
const { room_id, user_id } = window["room_vars"]
orchestrator.init({ socket, room_id, user_id });

```
Finally, the `orchestrator.ts` file will invoke `orchestrator.init` grabbing socket and room_vars which already exist on the window object.

Remember that whenever we add a new system, we'll need to update the orchestrator.ts file or the new system won't be reachable.


You should end up with a `assets/js` folder structure like this, setting us up to create more and more systems:

```
├── app.ts
├── config.ts
├── orchestrator.ts
└── systems
    ├── broker.ts
    └── scene.ts
```


Open up your browser and navigate to a specific room URL and you should see a 3D scene now!  Our camera is also already integrated with the keyboard and mouse so you can travel around in the scene, by clicking and dragging your mouse and then using the cursor keys to move forward or backward.  To open up the Babylon.js inspector we've added a short-cut (CTRL-b), so that we can inspect the meshes in the scene.  


### Summary

In this chapter we started organizing our typescript files into systems.  Each system should be responsible for one aspect of our game.  We created two systems thus far.  We created a broker system which is responsible for connecting to the Phoenix room channel.  We created a scene system which is responsible for creating a basic Babylon.js scene.  We created a `config` file to share variables between systems.  We then imported both systems into a `orchestrator.ts` file.  The orchestrator automatically runs an `init` function which in turn runs the `init` function for each system, passing the config object to each system.  We modified our `build.js` to add `orchestrator.ts` as an additional entry point so that we produce an `orchestrator.js` bundle.  We then conditionally added the script tag for `orchestrator.js` into our `root.html.heex` layout file, when a flag `orchestrator` evaluates to true.  We added the `orchestrator=true` flag to the render function's assigns in the show function of `room_controller.ex`.  We replaced the `show.html.heex` template contents for the `room_controller` so that variables such as room_id and user_id can be shared with the orchestrator's init function.

