## Enable Immersive VR Experience

Up until now we've been developing on a desktop by running the server on our local machine and then pointing our browser at `http://localhost:4000`.  In order to test the experience on our headset, we'll need to point the browser in the headset to a suitable ip address.

The address `http://localhost:4000` is a special address that only works on the machine the server is running on.  In order for the headset to access the development server, and because we need https to launch the xr experience, we'll use an ssh tunnel.

### Using an SSH Tunnel

The easiest solution I have found that works in the headset is to use a service like Ngrok to create an ssh tunnel.  Ngrok is free.  Follow their docs to create an account and install the ngrok executable.  

https://ngrok.com/docs/getting-started/

Once the ngrok utility is installed (and you've logged in via the command line), you can create a tunnel like this:

```bash
ngrok http 4000
```

This command will spit out a lengthy but public domain name.  The nice thing is that we now have a public URL to give to external testers outside of your home network.

### Tip for saving some typing

In order to save some typing of long URLs into the Quest browser, I utilize another service called glitch.me.  glitch is a service that allows you to host simple web projects.  I created myself a project that is a simple index.html page with some links.  On my desktop machine I edit the index.html page and add the lengthy URL that ngrok provides me.  Then in the Quest browser I navigate to my well known glitch.me page and the link is present on the page for me to click.  If you know of another way to share links that you can easily click on inside the Quest let me know.

### Create XR Experience System

Create a new system at `assets/js/systems/xr-experience.ts` and paste the following:

```typescript
import { Config } from "../config";


export const init = async (config: Config) => {
  if (!navigator["xr"]) {
    return;
  }
  // required for side-effects
  await import("@babylonjs/core/Helpers/sceneHelpers");
  const { scene } = config;
  const xrHelper = await scene.createDefaultXRExperienceAsync({});
};
```

This init function will exit immediately if this browser cannot support WebXR.  Next we import `@babylonjs/core/Helpers/sceneHelpers`.  Without it, the `createDefaultXRExperienceAsync` method is undefined on the `scene` instance.  This is due to some ES6 tree-shaking organization.  Next we call `createDefaultXRExperienceAsync` to enable the user to jump into an immersive-vr experience.

Remember to include new systems in `orchestrator.ts` or this system won't be included.

```typescript
...
import * as XRExperience from "./systems/xr-experience";
...
        XRExperience.init(config);
...
```

If you visit a room in the browser now you should see a pair of glasses in the lower right corner of the screen.  You'll need to install an XR emulator for the desktop browser in order to see the glasses icon on your desktop browser.  It should work automatically for a headset like the Oculus Quest.  When you click on the glasses the very first time (first time per site that requests XR), the browser will open a prompt to ask you permission to enable Web XR.  Confirm that you want to allow entering XR.

### Prevent Immersive VR Button until first-interaction.

The default XR experience helper places a glasses button that sits on-top of our first-user-interaction modal, which allows the user to jump into an immersive-xr experience before they dismiss the modal.  That's a distraction from our modal.  We could adjust our modal's z-index stylings so that our modal prevents clicking on the glasses, but the mere presentation of the glasses being on the screen at all would still be confusing.  It's cleaner to just hide the glasses until the user enters the room.

Since we have the RxJS Subject for when the user has chosen to join the room, we can subscribe to that and enable the default XR Experience in that callback:

```typescript
  config.$room_entered.subscribe(async () => {
    await scene.createDefaultXRExperienceAsync({});
  });
```

Now the glasses only show up after the user joins the room.

### Automatically Enter Immersive-VR on Headsets

The glasses button is fine for desktop, but it would be nice to automatically enter into immersive-vr session if we're on a headset.  To do this we can detect if the user agent looks like a headset and then automatically turn on immersive-vr.

First let's create a utility function for checking the type of browser.  I grabbed some of these useful functions looking through the Mozilla Hubs codebase.  

```typescript
/* eslint-disable no-useless-escape */
export const xrSupported = () => {
  return !window["debug"] && navigator["xr"] !== undefined;
};

export const isMobile = (function () {
  let _isMobile = false;
  (function (a) {
    if (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
        a
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        a.substr(0, 4)
      )
    ) {
      _isMobile = true;
    }
    if (isIOS() || isTablet(a) || isR7()) {
      _isMobile = true;
    }
    if (isMobileVR()) {
      _isMobile = false;
    }
  })(window.navigator.userAgent || window.navigator.vendor || window["opera"]);
  const urlParams = new URLSearchParams(location.search);
  return function () {
    return _isMobile || urlParams.has("isMobile");
  };
})();

export function isTablet(mockUserAgent) {
  const userAgent = mockUserAgent || window.navigator.userAgent;
  return /ipad|Nexus (7|9)|xoom|sch-i800|playbook|tablet|kindle/i.test(
    userAgent
  );
}

export function isIOS() {
  return /iPad|iPhone|iPod/.test(window.navigator.platform);
}

export function isMobileDeviceRequestingDesktopSite() {
  return !isMobile() && !isMobileVR() && window.orientation !== undefined;
}

/**
 *  Detect Oculus Browser (standalone headset)
 */
export function isOculusBrowser() {
  return /(OculusBrowser)/i.test(window.navigator.userAgent);
}

/**
 *  Detect Firefox Reality (standalone headset)
 */
export function isFirefoxReality() {
  return /(Mobile VR)/i.test(window.navigator.userAgent);
}

/**
 *  Detect browsers in Stand-Alone headsets
 */
export function isMobileVR() {
  return isOculusBrowser() || isFirefoxReality();
}

export function isR7() {
  return /R7 Build/.test(window.navigator.userAgent);
}

/**
 * Checks mobile device orientation.
 * @return {Boolean} True if landscape orientation.
 */
export const isLandscape = function () {
  let orientation = window.orientation;
  if (isR7()) {
    orientation += 90;
  }
  return orientation === 90 || orientation === -90;
};

```

Next we'll use the utility function `isMobileVR` and then start VR.

```typescript

import { Config } from "../config";
import * as Browser from "../browser";
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience";

export const init = async (config: Config) => {
  if (!Browser.xrSupported()) {
    return;
  }

  await import("@babylonjs/core/Helpers/sceneHelpers");
  const { scene } = config;

  config.$room_entered.subscribe(async () => {
    const xrHelper = await scene.createDefaultXRExperienceAsync({});

    // probably a headset
    if (Browser.isMobileVR()) {
      await enterXR(xrHelper);
    }
  });
};

export const enterXR = async (xrHelper: WebXRDefaultExperience) => {
  return xrHelper.baseExperience.enterXRAsync(
    "immersive-vr",
    "local-floor" /*, optionalRenderTarget */
  );
};
```

### Creating Signals for Entering and Exiting VR

If you move your head around while wearing the headset then check the server logs you may be wondering why there aren't any user moved events hitting the room channel at all.  This is because the WebXR default experience creates a brand new XR camera that is a different camera then the one we created in the scene by default.  Therefore the new camera doesn't have any subscription to listen to it's data yet.  To send data from the XR camera we need to duplicate that subscription that we previously created for our regular camera.  However we can only create that subscription when the xr camera is ready.  To enable us to create subscriptions and possibly remove subscriptions when we leave xr, let's create some RxJS subjects for that.

Add these new signals to `config.ts` so we can easily subscribe to when we're entering or exiting XR from anywhere in the codebase.

```typescript
...
  $xr_entered: Subject<boolean>;
  $xr_exited: Subject<boolean>;
...
```

Initialize them in `orchestrator.ts`

```typescript
...
            $xr_entered: new Subject<boolean>(),
            $xr_exited: new Subject<boolean>(),
...
```

Send signals to them from within the `vr-experience.ts` system:

```typescript

    xrHelper.baseExperience.onStateChangedObservable.add((state: WebXRState) => {
      if (state === WebXRState.IN_XR) {
        $xr_entered.next(true);
      } else if (state === WebXRState.NOT_IN_XR) {
        $xr_exited.next(true);
      }
    });
```


### Allow Teleport on Ground

Now that we can enter VR, we can look around and step side to side but we're going to need to enable teleportation.

Babylon.js comes with a teleporation feature that we can enable.  It requires a list of floors we can teleport upon.  Let's create a system that is dedicated to floors that will add and remove floor meshes to the teleportation manager whenever an entity with a ground component is created or deleted.  It will also loop through all floor meshes and add them into the manager when the user enters immersive VR.  To do that, let's add another RxJS Subject for when the user enters or exits VR.

In `rooms.exs` we can add a floors component like so:

```elixir
  def create_floor(room_id) do
    create_entity(room_id, Xr.Utils.random_string(), %{
      "mesh_builder" => ["ground", %{"width" => 100, "height" => 100, "subdivisions" => 2}],
      "position" => [0, 0, 0],
      "material" => "grid",
      "teleportable" => true,
    })
  end
```

After this change any new rooms we create will get the floor component on the ground mesh.  I recommend running `mix ecto.reset` so we get a fresh database and then just create a new room.

Next we will work on a floor system to react to the `floor` component.  The system will need access to the xrHelper in the floor system so first let's add that to the Config type.

We could add a property like this:

```typescript

  xrHelper?: WebXRDefaultExperience
```

However, remember that the xrHelper was created asyncronously like this:

```typescript
config.$room_entered.subscribe(async () => {
    const xrHelper = await scene.createDefaultXRExperienceAsync({});
    ...
```

We'll put it in config.xr_helper so that it's available to other systems, but we but we'd need to be very careful to remember not to deconstruct xrHelper like this in other systems:

```typescript
const init = (config) => {
  const { xr_helper } = config
}
```

And that's because it won't be populated until $room_entered emits a signal AND the sync promise resolves.  That could be a confusing gotcha to fall into later.  We need a better mechansim to wait for when the xrHelper is ready before we use it.  We can use another RxJS Subject for this.

```typescript
  $xr_helper_created: Subject<WebXRDefaultExperience>;
```

Construct it in `orchestrator.ts`

```typescript
...
            xr_helper?: WebXRDefaultExperience,
            $xr_helper_created: new Subject<WebXRDefaultExperience>(),
            $xr_entered: new Subject<boolean>(),
            $xr_exited: new Subject<boolean>(),
```

Now back in `xr-experience.ts` let's pass the xrHelper into the Subject when it is ready.  Here is the updated file:

```typescript
import { Config } from "../config";
import * as Browser from "../browser";
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience";
import { WebXRState } from "@babylonjs/core/XR/webXRTypes";
import { takeUntil } from "rxjs";

export const init = async (config: Config) => {
  if (!Browser.xrSupported()) {
    return;
  }

  await import("@babylonjs/core/Helpers/sceneHelpers");

  const { scene, $xr_entered, $xr_exited, $xr_helper_created } = config;

  config.$room_entered.subscribe(async () => {
    const xrHelper = await scene.createDefaultXRExperienceAsync({});
    $xr_helper_created.next(xrHelper);

    xrHelper.baseExperience.onStateChangedObservable.add((state: WebXRState) => {
      if (state === WebXRState.IN_XR) {
        $xr_entered.next(true);
      } else if (state === WebXRState.NOT_IN_XR) {
        $xr_exited.next(true);
      }
    });

    // probably a headset
    if (Browser.isMobileVR()) {
      await enterXR(xrHelper);
    }
  });
};

export const enterXR = async (xrHelper: WebXRDefaultExperience) => {
  return xrHelper.baseExperience.enterXRAsync(
    "immersive-vr",
    "local-floor" /*, optionalRenderTarget */
  );
};
```

Now if a system needs to use xr_helper they can subscribe to the xr_helper_ready Subject.

Let's create that floor system we talked about:

```typescript
import { StateOperation, componentExists, Config } from "../config";
import { filter } from "rxjs/operators";
import { WebXRFeatureName } from "@babylonjs/core/XR/webXRFeaturesManager";
import { WebXRMotionControllerTeleportation } from "@babylonjs/core/XR/features/WebXRControllerTeleportation";
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience";
import { Tags } from "@babylonjs/core/Misc/tags";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

export const init = (config: Config) => {
  const { scene, $xr_entered, $xr_exited, $state_mutations, $xr_helper_created } = config;
  let teleportation: WebXRMotionControllerTeleportation;

  const on_helper_ready = (xrHelper: WebXRDefaultExperience) => {
    $xr_entered.subscribe(() => {
      
      // enable the teleporation feature on the xrHelper
      teleportation =
        xrHelper.baseExperience.featuresManager.enableFeature(
          WebXRFeatureName.TELEPORTATION,
          "latest" /* or latest */,
          {
            xrInput: xrHelper.input,
            floorMeshes: [],
            defaultTargetMeshOptions: {
              teleportationFillColor: "yellow",
              teleportationBorderColor: "green",
              timeToTeleport: 0,
              disableAnimation: true,
              disableLighting: true,
            },
            forceHandedness: "right",
          }
        ) as WebXRMotionControllerTeleportation;
      teleportation.rotationEnabled = false;
      teleportation.straightRayEnabled = false;
      teleportation.parabolicCheckRadius = 0.5;

      window["teleportation"] = teleportation;
      // grab all existing entities that are a floor and add them into the teleporation feature manager
      const floor_meshes = scene.getMeshesByTags("teleportable");
      teleportation["_floorMeshes"] = floor_meshes;
    });

    $xr_exited.subscribe(() => {
      xrHelper.baseExperience.featuresManager.disableFeature(WebXRFeatureName.TELEPORTATION);
      teleportation = null;
    });

  };

  const add_entity_as_floor = (eid: string) => {
    const mesh = scene.getMeshByName(eid);
    if (mesh) {
      Tags.AddTagsTo(mesh, "teleportable");
    }
    if (teleportation) {
      teleportation.addFloorMesh(mesh);
    }
  };

  const remove_entity_as_floor = (eid: string) => {
    const mesh = scene.getMeshByName(eid);
    if (mesh) {
      Tags.RemoveTagsFrom(mesh, "teleportable");
    }
    if (teleportation) {
      if (mesh) {
        teleportation.removeFloorMesh(mesh);
      } else {
        // in case mesh was removed by another system
        teleportation["_floorMeshes"] = teleportation["_floorMeshes"].filter((mesh) => mesh.name !== eid);
      }
    }
  };

  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.create)),
    filter(componentExists("teleportable")),
  ).subscribe((evt) => {
    add_entity_as_floor(evt.eid);
  });

  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.delete)),
    filter(componentExists("teleportable")),
  ).subscribe((evt) => {
    remove_entity_as_floor(evt.eid);
  });

  $xr_helper_created.subscribe((xrHelper) => {
    on_helper_ready(xrHelper);
  });

};

```

The floor system listens to the floor component.  When a floor is added to the scene we add a Babylon.js TAG to the mesh so we can easily find all floor surfaces later.  Since this is an XR only feature, we wait until the xrHelper to be ready and add more listeners for when we enter and exit XR.  When we enter, we enable the teleportation feature and add all floor meshes into the teleportation manager.  When we exit, we'll disable the teleporation feature.  If new floors are added or removed in real time while we are in XR they will be udpated on the teleportation manager.  If we are not in XR, adding or removing floors will only add or remove Tags since the teleportation manager will be undefined.

While testing this I got some console.log errors due to some modules being undefined.  After some research I found we need to add these imports because the default XR experience needs to load some meshes for hand controllers and materials.  Due to the way ES6 modules are organized for tree-shaking some modules are not loaded when we directly import the subpackage, so sometimes we need to load a parent package to get the side-effect.  Add this to the `scene.ts` and we'll be good.

```typescript
import "@babylonjs/core/Materials/Node/Blocks";
import "@babylonjs/loaders/glTF";
```

### Summary

In this chapter we enabled the default WebXR Experience that comes with Babylon.js.  We launch it after the user dismisses the enter room modal.  We also add user-agent detection to try to determine if the client is a VR headset and if so, jump into immersive VR after they dismiss the modal.  Next we added the ability to teleport around the scene using the teleportation feature that comes with Babylon.js.  To define meshes that are "teleportable", we added a "teleportable" component and a system of the same name to handle it.  