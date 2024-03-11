## Pick-up objects

Next we will implement the ability to grab an object and hold it in our hand.  The sequence of steps is:

1. Listen for when the squeeze button is pressed in either the left or right hand controllers
2. If there is a holdable mesh near the grip of the hand controller then emit a room event that a user is holding that mesh id
3. The server receives the room event and converts it into a state_diff event.
4. The frontend recieves the state_diff event and parents the holdable mesh underneath the hand mesh of the avatar (makes the holdable mesh a child of the hand mesh).
   
### Create Grabbable Objects

First let's define what are grabble objects.  In order to determine what mesh is "near" our hand that is squeezing the grip button, we'll use mesh intersection.  The API for mesh intersection testing takes two meshes and see if they intersect.  If they intersect that means they are close enough to grab.  If they don't intersect we're just too far.  

That means every time we squeeze the grip button we'll need to compare our hand mesh (or some other mesh near our hand we use to test intersections) with every other mesh in the room to see if there is an intersection.  To reduce some of the meshes we need to compare against we can tag these special meshes as "holdable" and only test intersections against those meshes.

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
Now any new room that we create will have a row of boxes near the origin that are holdable that we can test with.

### Detect when Grip intersects a Grabbable Object

Next we need a way to know if the user is close enough to an object to "grab" it.  We'll use the built in Babylon.js mesh intersection functions to see if one mesh is intersecting another.  We check for intersections at the moment the squeeze component is pressed.  And we won't check against any meshes that don't have a "holdable" tag.  On the first mesh that satisfies this requirement, we'll emit a room event.

Let's begin by creating a new system called `holdable.ts`

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
...
```

We match on the creation (or update) of any entity that contains the holdable component and use the Babylon.js Tag utility to tag that mesh.  That will allow us to find all meshes tagged with a value to quickly find them later.

Next we create a detection sphere.  This is just a hidden sphere that we'll move to the grip of our hand and use that for intersection testing against all meshes tagged with "holdable".  If we find a mesh that intersects we'll emit an event.

```typescript
  ...
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
    // we need to update the matrix or else the intersection will not work
    detection_sphere.computeWorldMatrix(true);
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
We are emitting an even using channel.push and sending a new type of event called "event" with a payload of `{ event_name: "user_picked_up", payload: { target_id: mesh.name, user_id: config.user_id, hand: evt.handedness } }`

Add this new system to orchestrator.ts and initialize it as always.

### Intercept Event on Server Side

Our Room Channel GenServer will crash and immediately restart when we receive a new event that is unhandled so let's add a new handler.  This is the first time we're sending an event of type "event".  We will call our Xr.Utils.to_room_stream function to publish it as a room event.

In `room_channel.ex`

```elixir

  def handle_in("event", %{"event_name" => event_name, "payload" => payload}, socket) do
    Xr.Utils.to_room_stream(socket.assigns.room_id, event_name, payload)
    {:noreply, socket}
  end
```

Recall that room events are being subscribed to in the Xr.Servers.EntitiesDiff GenServer.  That GenServer uses `Xr.RoomEvents.StateMutation.process` multi-headed function to convert room events into entity_diff events.

Open up `state_mutation.ex` and add these functions:

```elixir

  def process(
        "user_picked_up",
        %{"user_id" => user_id, "target_id" => target_id, "hand" => hand},
        table
      ) do
    # avatar is created with these meshes
    # const leftId = (user_id: string) => `${user_id}:left`;
    # const rightId = (user_id: string) => `${user_id}:right`;

    insert(target_id, :update, %{"parent" => "#{user_id}:#{hand}"}, table)
  end


```
Recall the `insert` function inserts an entry into an ETS table that will be synced out.  The user_picked_up message is converted into a component of `parent`.  The target_id is the entity_id of the holdable mesh.  We're saying that that holdable mesh now has a parent of the users hand.  `%{"parent" => "#{user_id}:#{hand}"}`.

When the front end receives this, it should parent the holdable mesh to the avatar's hand mesh, which is named like this: `"#{user_id}:#{hand}"`.

Now let's create the parent system.  Add this file `assets/js/systems/parent.ts`:

```typescript
import { filter } from "rxjs/operators";
import { Config, StateOperation, componentExists } from "../config";

/*
This system primarily used for grabbing and holding objects in hands
*/
export const init = (config: Config) => {
  const { scene, $state_mutations } = config;
  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.update || evt.op === StateOperation.create)),
    filter(componentExists("parent")),
  ).subscribe((evt) => {
    const parent_mesh_id: null | string = evt.com["parent"];
    const child_mesh = scene.getMeshByName(evt.eid);
    if (!child_mesh) {
      // error can't find the child mesh in the scene
      // can't do anything, fail silently
      return;
    }
    if (parent_mesh_id === null) {
      // set this child mesh free from parents
      child_mesh.setParent(null);
      return;
    }
    // else parent the child to the parent, we'll introduce a slight delay
    // in the case we're building the scene from the entities_state and
    // this child mesh is processed before the parent mesh is defined
    setTimeout(() => {
      // wait a bit for the parent mesh to be created
      const parent_mesh = scene.getMeshByName(parent_mesh_id);
      if (parent_mesh && child_mesh.parent !== parent_mesh) {
        child_mesh.setParent(parent_mesh);
      }
    }, 10);
  });
};
```

Add this new system to orchestrator and call its init as usual.

Now if we test this in our headset we should be able to stick our hand in or near one of the holdable boxes, squeeze the grip button and wha-la!  The box is following our hand no matter where we move our hand.  Except... we can't let it go even if we release the squeeze button.

### Add ability to release the holdable box.

Make the following changes to `holdable.ts`, adding a subscription to exactly one release event following that of the squeeze.  If we're still holding the mesh we'll emit a user_released type of event.  On the other hand the other hand might have grabbed the object from the first hand, in which case there is no need to emit a user_released event, because doing so would force an unparenting of the holdable mesh from the second hand.

```typescript
/**
 * Whenever we detect a squeeze on a holdable mesh
 * send a message to the server
 */
config.$xr_button_changes.pipe(
  filter(press_evt => press_evt.type === "squeeze" && press_evt.pressed?.previous === false && press_evt.pressed?.current === true),
).subscribe((press_evt) => {

  const mesh = hold_detection(press_evt.handedness as "left" | "right");
  if (mesh) {
    // pre-emptive parenting for faster grabbing
    const hand_mesh = config.scene.getMeshByName(`${config.user_id}:${press_evt.handedness}`);
    if (hand_mesh) {
      mesh.setParent(hand_mesh);
    }
    // now send a message
    config.channel.push("event", { event_name: "user_picked_up", payload: { target_id: mesh.name, user_id: config.user_id, hand: press_evt.handedness } });
    // now listen for a release of the same hand
    config.$xr_button_changes.pipe(
      filter(release_evt => release_evt.type === "squeeze" && release_evt.handedness === press_evt.handedness && release_evt.pressed?.previous === true && release_evt.pressed?.current === false),
      take(1),
    ).subscribe((release_evt) => {
      // if this hand was still the parent, then send a release
      if (mesh.parent && hand_mesh && mesh.parent.name === hand_mesh.name) {
        mesh.setParent(null);

        config.channel.push("event", { event_name: "user_released", payload: { target_id: mesh.name, user_id: config.user_id, hand: release_evt.handedness } });
      }
    });
  }

});

```

Add this to state_mutation.ex to handle the user_released room event.

```elixir
  def process(
        "user_released",
        %{"target_id" => target_id},
        table
      ) do
    insert(target_id, :update, %{"parent" => nil}, table)
  end
```

Notice that the user_released domain event is translated to the parent => nil component update.  So there is nothing else we need to do becuase the parent system is already handling the case when the component is null, and will unparent the held object.

### Summary

In this chapter we added the ability to grab holdable objects in the scene using the squeeze button and then release them by releasing the squeeze button.  We defined objects in the scene that were designated as holdable by having a component "holdable" equal to true.  We listened for the squeeze event coming from our hand controller(s) then checked to see if there was an intersection of a holdable mesh and our hand (via a detection sphere).  If there was we emited a high level domain event "user_picked_up".  We added a function in state_mutation.ex that converts the domain event into a "low level" entity_state change of the "parent" component.  We added a parent system to handle such changes.  The parent system listens for changes involving the parent component and then calls Babylon.js setParent API, making the holdable mesh a child of the avatar hand mesh.  Finally we add the ability to release the mesh, by listening for squeeze release and translating that into an unparent action.
