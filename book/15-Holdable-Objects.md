## Pick-up objects

Next we will implement the ability to grab an object and hold it in our hand.  The sequence of steps is:

1. Listen for when the squeeze button is pressed in either the left or right hand controllers
2. If there is a holdable mesh near the grip of the hand controller then emit a room event that a user is holding target mesh
3. The server receives the room event and converts it int a state_diff event.
4. The front end recieves the state_diff event and parents the holdable mesh underneath the hand mesh of the avatar.
   
### Create Grabbable Objects

First let's define what are grabble objects.  In order to determine what mesh is "near" our hand that is squeezing the grip button, we'll use mesh intersection.  The API for mesh intersection testing takes two meshes and see if they intersect.  That means every time we squeeze the grip button we'll need to compare our hand with every other mesh in the room to see if there is an intersection.  To reduce some of the meshes we need to compare against we can tag these special meshes as "holdable" and only compare against those meshes.

Let's begin by placing some objects in the scene that we can grab and hold.  Open up `rooms.exs` and add this function to create several cubes that we'll make holdable.

```elixir
  def create_holdables(room_id) do
    [x, y, z] = [0, 1, 0]
    # create a row of 10 grabbable boxes
    for i <- 1..10 do
      create_entity(room_id, Xr.Utils.random_string(), %{
        "mesh_builder" => ["box", %{"size" => 0.5}],
        "position" => [x + i - 5, y, z + i - 5],
        "holdable" => true
      })
    end
  end
```

Call this function in our `generate_random_content` function:

```elixir
    # create holdables
    create_holdables(room_id)
```

### Detect when Grip intersects a Grabbable Object

Next we need a way to know if the user is close enough to an object to "grab" it.  We'll use the built in Babylon.js mesh intersection functions to see if one mesh is intersecting another.  To avoid calling this function until necessary, we won't check unless the squeeze component is pressed.  And we won't check against any meshes that don't have a "holdable" tag.  On the first mesh that satisfies this requirement, we'll emit a room event.

Let's create a new system called `holdable.ts`

```typescript
import { filter } from "rxjs";
import { Config, StateOperation, componentExists } from "../config";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { Tags } from "@babylonjs/core/Misc/tags";

export const init = (config: Config) => {

  const { scene, $state_mutations } = config;

  /**
   * Whenever we create or update an entity with a holdable component
   * add or remove the holdable tag from the mesh
   */
  $state_mutations.pipe(
    filter(componentExists("holdable")),
    filter(evt => (evt.op === StateOperation.create || evt.op === StateOperation.update)),
  ).subscribe((evt) => {
    const holdable = evt.com["holdable"];
    const mesh = scene.getMeshByName(evt.eid);
    if (!mesh) {
      
      return;
    }
    if (holdable) {
      // add tag
      Tags.AddTagsTo(mesh, "holdable");
    } else {
      // remove tag
      Tags.RemoveTagsFrom(mesh, "holdable");
    }
  });

  // to aid in mesh intersection with right or left hand we'll use this large-ish sphere
  const detection_sphere = CreateSphere("detection_sphere", { diameter: 0.4, segments: 16 }, scene);
  detection_sphere.isVisible = false;


  /**
   * First moves the sphere to the position of the grip
   * then checks for intersection with all meshes with holdable tag
   * and returns the first one found
   * 
   * @param handedness "left" | "right"
   * @returns AbstractMesh | null
   */
  const hold_detection = (handedness: "left" | "right"): AbstractMesh | null => {
    const grip = config.hand_controller[`${handedness}_grip`];
    if (!grip) {
      return;
    }
    // move detection sphere to grip position then check for intersection with all meshes with holdable tag
    detection_sphere.position.copyFrom(grip.position);
    const meshes = scene.getMeshesByTags("holdable");

    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      if (mesh.intersectsMesh(detection_sphere)) {
        return mesh;
      }
    }
  };


  /**
   * Whenever we detect a squeeze on a holdable mesh
   * send a message to the server
   */
  config.$xr_button_changes.pipe(
    filter(evt => evt.type === "squeeze" && evt.pressed.previous === false && evt.pressed.current === true),
  ).subscribe((evt) => {

    const mesh = hold_detection(evt.handedness as "left" | "right");
    if (mesh) {
      config.channel.push("event", { event_name: "user_picked_up", payload: { target_id: mesh.name, user_id: config.user_id, hand: evt.handedness } });
    }

  });


};
```

Add this new system to orchestrator.ts and initialize it as always.

### Intercept Grab Event on Server Side

Our Room Channel GenServer will crash and immediately restart when we receive a new event that is unhandled, such as for the grab event.  Let's add a new handler.  This is the first time we're sending an event of type "event".  We can directly pass it through to the room stream.

In `room_channel.ex`

```elixir

  def handle_in("event", %{"event_name" => event_name, "payload" => payload}, socket) do
    Xr.Utils.to_room_stream(socket.assigns.room_id, event_name, payload)
    {:noreply, socket}
  end
```

Now we need to map a room_event into a state_mutation event.