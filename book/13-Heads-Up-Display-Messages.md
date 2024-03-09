## Heads-Up-Display Messages

Before we start developing more VR features, we're going to need a way to view the console logs.  I haven't found a way to open up the developer console in the Quest browser.  The next best thing would be to create a texture in the 3D scene and print the logs onto the texture tracking with the XR camera so we can see the logs no matter where we are looking.

This heads up display messaging will also be useful for other system messages, such as when someone enters or leaves a room etc.

### Create Utility Layer and Texture

First let's create a system called `assets/js/hud.ts` for heads-up-display.

```typescript
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { UtilityLayerRenderer } from "@babylonjs/core/Rendering/utilityLayerRenderer";

import { Config } from "../config";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

let plane: AbstractMesh;
let guiText: TextBlock;

export const init = (config: Config) => {
  const { scene } = config;

  createTextureWall();
  

};

const createTextureWall = () => {
  console.log("creating the utility layer");
  const utilLayer = UtilityLayerRenderer.DefaultUtilityLayer;
  plane = CreatePlane("hud_msg_plane", { size: 5 }, utilLayer.utilityLayerScene);
  plane.position.z = 2.5;
  plane.isPickable = false;
  // plane.visibility = 0
  // plane.setEnabled(false)

  const texture = AdvancedDynamicTexture.CreateForMesh(plane, 2024, 2024, false);
  texture.hasAlpha = true;
  guiText = new TextBlock("hud_text", "Hello worrrrlddd!!!");
  guiText.color = "white";
  guiText.fontSize = 100;
  guiText.textWrapping = true;
  texture.addControl(guiText);

};

```

We want our messages to be on top of everything we see in the scene so that they aren't covered by objects such as walls or people.  To do this, Babylon.js provides Utility Layers that will render on top of the scene.  First we create a `utilLayer` then add a `plane` in that layer.  We push the plane 2.5 meters back so we're not too close to the text.  We set isPickable to false so that it won't interfere with our ability to pick object through the utility layer.  Then we create an AdvancedDynamicTexture from the plane mesh.  The AdvancedDynamicTexture is a texture that we can continously update with content.  We'll only be adding a TextBlock to the texture.  When we change the text attribute of `guiText` the dynamic texture will be immediately updated.

Initialize the Hud system in the orchestrator as usual.  Then reload the page and you should be able to see test "Hello world" text near the origin.

### Lock Plane to Camera

We don't have to have to look at the origin when there are new messages to see.  Instead we want to parent the plane to the camera.  However when we enter xr we'll need to parent the plane to the xr-camera.  And when we exit vr we'll need reparent the plane to the default camera.  

```typescript

const parentPlaneToCamera = (config: Config) => {
  config.$room_entered.subscribe(() => {
    plane.parent = config.scene.activeCamera;
  });

  config.$xr_entered.subscribe(() => {
    plane.parent = config.scene.activeCamera;
  });

  config.$xr_exited.subscribe(() => {
    plane.parent = config.scene.activeCamera;
  });
};
```

Then add this line in the init function:

```typescript
  parentPlaneToCamera(config);
```

Now whenever we enter or exit immersive-vr mode we'll get the plane parented to the new active camera.  For good measure we do the same thing when we first enter the room to support desktop that never enters or exits vr.

### Create API to send messages to the HUD

Now we need to expose an API to add messages onto the texture.  We can add a Subject on the Config object so that we can access it from any system.

```typescript
  $hud_text: Subject<string>;
```
And initialize it in orchestrator.ts

```typescript
 $hud_text: new Subject<string>(),
```

Now we can subscribe to the subject in the hub system and update the guiText.  

```typescript
  config.$hud_text.subscribe((text) => {
    guiText.text = text;
  });
```

We can text that in the javascript console by pushing some new messages into the subject:

```typescript
  config.$hud_text.next("here there!")
```
The hud is immediately replaced with the new string.

But for logs it would be nice to see the last few logs in case they come in very quickly, we can see up to the last 10 msgs.  To do this we'll create an array so we can buffer the last 10 messages we receive.  The `scan` operator is useful for creating state over a series of events.  For each event we'll push it into an array and then if the array length exceeds 10 we'll remove the oldest message from the front of the array.

```typescript

config.$hud_text.pipe(
    scan((acc, text) => {
      acc.push(text);
      if (acc.length > 10) { acc.shift(); }
      return acc;
    }, []),
  ).subscribe((array) => {
    guiText.text = array.join("\n");
  });
```

### Clear Screen After 5 Seconds

We'll give ourselves 5 seconds to read the messages before we clear the screen.  That is if messages come in faster than 5 seconds between messages then they will accumulate on the screen (keeping the last 10).  But if there is a break, than after 5 seconds we'll wipe the screen clean.

```typescript
config.$hud_text.pipe(
    scan((acc, text) => {
      acc.buffer.push(text);
      if (acc.buffer.length > 10) { acc.buffer.shift(); }
      // cancel previous timeout
      if (acc.timeout) {
        clearTimeout(acc.timeout);
      }
      acc.timeout = setTimeout(() => {
        acc.buffer = [];
        guiText.text = "";
      }, 5000);
      return acc;
    }, { buffer: [], timeout: null }),

  ).subscribe(payload => {
    guiText.text = payload.buffer.join("\n");
  });
```

### Trap Unexpected Errors and Send Them to HUD

This function window.onerror defines a handler when an error bubbles up to the window object.  It may not be pretty, but it's something that at least gives us a clue that some kind of error happened and we can dig into it further.

```typescript

  window.onerror =
    function (msg, source, lineNo, columnNo, error) {
      const line = `${msg} ${source} ${lineNo} ${columnNo} ${error}`;
      config.$hud_text.next(line);
      return true;
    };
```

### Summary

In this chapter we enabled the ability to post text onto headset by inserting a message into `config.$hud_text.next("my string")`.  This will make it easier to debug the headset by sending trace messages here where we can read them inside the headset.  For unexpected errors we added a window.onerror handler that will attempt to print the error to the HUD display.


