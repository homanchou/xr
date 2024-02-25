
## Presence

Virtual presence is the concept of being able to see each other online at the same time in a shared space.  The first events that we will work on will help us establish our avatar head position and rotation.  Our goal is to produce some room events like this:

```
{event: "user_joined", payload: {user_id: "tom", pose: {head: [...]}}
{event: "user_moved", payload: {user_id: "tom", pose: {head: [...]}}
{event: "user_left", payload: {user_id: "tom"}}
```
This way as soon as someone joins the room, we know where to draw them.  And when someone moves we know where to move them.

### Joining Needs a Position

Starting with the "user_joined" event, it makes sense that when we join a room we first appear in a location that is dictated by the kind of environment the room is hosting.  Thus far we've hardcoded our camera at a fixed location in the scene like security camera overseeing everything.  But just like the other entities that a room stores about itself in the components table, we ought to have one entity specifically purposed to tell us where the game starts.  This entity is called the spawn_point.

### Create Spawn Point Entity

Create a new entity called `spawn_point` in the `generate_random_content` function in `rooms.ex`:

```elixir
    # create spawn_point
    create_entity(room_id, Xr.Utils.random_string(), %{
      "tag" => "spawn_point",
      "position" => [Enum.random(-10..10), 0.1, Enum.random(-10..10)]
    })
```
We'd like to re-use common component names since we'll have a suite of systems that are listening for particular component names.  We also need to be able to somehow tag (aka label) this entity as a "spawn_point".  Since the entity itself is just an id with no other information, all data is stored in some kind of component so we added a "spawn_point" tag just so we can find this entity later by one of its component names.

The spawn_point for now is just a random point in 3D space between -10 and 10 on the x and z axis and slightly above y = 0 which is a common place to put the floor.  We may change this later for multi-leveled rooms.

In order to find a particular entity that has a particular component, or a particular component that matches a particular value let's define some additional helper functions in `rooms.ex`

```elixir
  def find_entities_having_component(room_id, component_name, component_value) do
    q =
      from(c in Xr.Rooms.Component,
        where:
          c.room_id == ^room_id and c.component_name == ^component_name and
            c.component[^component_name] == ^component_value,
        select: c.entity_id
      )

    components =
      from(c in Xr.Rooms.Component,
        where: c.room_id == ^room_id and c.entity_id in subquery(q)
      )
      |> Repo.all()

    if components |> length() == 0 do
      {:error, :not_found}
    else
      {:ok, components |> components_to_map()}
    end
  end

  def find_entities_having_component(room_id, component_name) do
    q =
      from(c in Xr.Rooms.Component,
        where: c.room_id == ^room_id and c.component_name == ^component_name,
        select: c.entity_id
      )

    components =
      from(c in Xr.Rooms.Component,
        where: c.room_id == ^room_id and c.entity_id in subquery(q)
      )
      |> Repo.all()

    if components |> length() == 0 do
      {:error, :not_found}
    else
      {:ok, components |> components_to_map()}
    end
  end
```

These queries first look in the components table for any component matching a name or name and value.  Then that result is used to find all components for entity_ids that were found.  The result is that we get everything about entities where the entities had a particular component.  This is similar to when we call `Xr.Rooms.entities(room_id)` getting a map of all entities except we're filtering by the matching criteria.  We also return a tuple of {:ok, result} vs {:error, :not_found}.

To help with these queries, let's add two more indexes to the components table.  Create a new migration (I just added to my existing migration since I didn't push my code to any build system yet):

```elixir
    create index(:components, [:room_id, :entity_id])
    # helps look up tags
    create index(:components, [:room_id, :component_name])
```

These indexes help us find any component_name in a room, to help us first find the entity_id.  Then find all components matching that entity_id in a room.

Let's also add a convenience function for looking up the spawn point and getting a location near a spawn_point.  This is useful for assigning positions to players when they join a room without them piling directly on top of each other:

```elixir
def get_head_position_near_spawn_point(room_id) do
  # grab the entities that have spawn_point as a component
  case Xr.Rooms.find_entities_having_component(room_id, "tag", "spawn_point") do
    # grabs position from first spawn_point's position component
    {:ok, entities_map} ->
      {_entity_id, %{"position" => [x, y, z]}} =
        entities_map |> Enum.find(fn {_k, v} -> %{"position" => _} = v end)

      # randomly calculate a position near it where the player head should be
      offset1 = Enum.random(-100..100) / 100
      offset2 = Enum.random(-100..100) / 100
      [x + offset1, y + 2, z + offset2]

    _ ->
      [0, 1.8, 0]
  end
end
```


You can clear all the rooms in the database you've created so far by stopping your server and running `mix ecto.reset`.  That will recreate and migrate all the tables.  Then start your server and create some new rooms, each new room created will have a spawn_point from now on.



We can test these new functions by adding to the `rooms_test.exs` file:

```elixir
 
    test "find entities by component name" do
      room = room_fixture()

      Rooms.create_entity(room.id, Xr.Utils.random_string(5), %{
        "tag" => "spawn_point",
        "position" => [0, 0, 0]
      })

      {:ok, entity} = Rooms.find_entities_having_component(room.id, "tag")
      assert entity |> Map.keys() |> Enum.count() == 1
      assert entity |> Map.values() |> List.first() |> Map.keys() |> Enum.count() == 2
    end

    test "find entities by component name and value" do
      room = room_fixture()

      Rooms.create_entity(room.id, Xr.Utils.random_string(5), %{
        "tag" => "spawn_point",
        "position" => [0, 0, 0]
      })

      {:ok, entity} = Rooms.find_entities_having_component(room.id, "tag", "spawn_point")
      assert entity |> Map.keys() |> Enum.count() == 1
      assert entity |> Map.values() |> List.first() |> Map.keys() |> Enum.count() == 2
    end

    test "get position near spawn point" do
      room = room_fixture()

      Rooms.create_entity(room.id, Xr.Utils.random_string(5), %{
        "tag" => "spawn_point",
        "position" => [0, 0, 0]
      })

      position = Rooms.get_head_position_near_spawn_point(room.id)
      assert position |> length() == 3
      assert position != [0, 0, 0]
    end
  end
```

Now that our room contains the concept of a spawn_point, we'll be able to use it when we join a room for the very first time.

### Add Phoenix Presence

To help us keep track of which user_ids are online, we're going to rely on an existing library called Phoenix Presence.  This pattern injects the ability to track which users are connected to a channel and we'll get some events and a database of user_ids for free.  By default usage of Phoenix Presence sends a "presence_diff" message to each connected client whenever clients join or leave the channel.    

Read more about it here: https://hexdocs.pm/phoenix/Phoenix.Presence.html  

Let's get started!  And wouldn't you know it?  There is a generator for this too.  Gotta love them generators!

```bash
mix phx.gen.presence
```

This creates a new file for us `xr_web/channels/presence.ex`.

Add your new module to your supervision tree, in `lib/xr/application.ex`, it must be after `PubSub` and before `Endpoint`:

```elixir
 ...
 children = [
   {Phoenix.PubSub, name: Xr.PubSub},
   ... 
   XrWeb.Presence,
   ...
   XrWeb.Endpoint
 ]
 ...
```

Modify `xr_web/channels/room_channel.ex` and add ` alias XrWeb.Presence` near the top of the file and also redefine the `after_join` handler:

```elixir
...
alias XrWeb.Presence
...

def handle_info(:after_join, socket) do
  {:ok, _} = Presence.track(socket, socket.assigns.user_id, %{})

  entities = Xr.Rooms.entities(socket.assigns.room_id)
  push(socket, "entities_state", entities)
  {:noreply, socket}
end
```

By adding `Presence.track` within the `RoomChannel` process Phoenix Presence is now tied to the life and death of the RoomChannel process.  You can test this quickly in the browser if you want:


If you want to log all the messages coming from the `RoomChannel`, I like to use this bit of debug code to `broker.ts` (we'll remember to remove it later):

```typescript
channel.onMessage = (event, payload, _) => {
  if (!event.startsWith("phx_") && !event.startsWith("chan_")) {
    // since this is debug level you'll need to set you browser's log level accordingly
    console.debug(event, payload);
  }
  return payload;
};
```

Go ahead and open two browser tabs and navigate to an existing room and inspect the console log to see what the data payloads look like when you open additional browsers or when you close them.  Your `console.debug` should show you a payload like:

```javascript
presence_diff {joins: {"39jfc": ...}, leaves: {}}
```
 
Although this message is triggered whenever someone joins the room channel or when someone closes the browser tab, it's not providing the event message shape that we want so we won't be making use of `presence_diff`.  We'll look into how we can reshape the Phoenix Presence messages next.  


### Phoenix Presence handle_metas Callback

It turns out Phoenix Presence provides a callback that we can add to our `channels/presence.ex` module that will get triggered everytime a client joins or leaves the room.  From that callback we could shape the kind of event that we want and send it into our room_stream.  Remember that our room_stream is our one destination for all our room events so every thing that happens in the room goes there and we'll figure out what to do with it later inside other GenServers that subscribe to the stream.

```elixir
defmodule XrWeb.Presence do
  @moduledoc """
  Provides presence tracking to channels and processes.

  See the [`Phoenix.Presence`](https://hexdocs.pm/phoenix/Phoenix.Presence.html)
  docs for more details.
  """
  use Phoenix.Presence,
    otp_app: :xr,
    pubsub_server: Xr.PubSub

  alias Xr.Rooms

  @doc """
  Presence is great for external clients, such as JavaScript applications,
  but it can also be used from an Elixir client process to keep track of presence changes
  as they happen on the server. This can be accomplished by implementing the optional init/1
   and handle_metas/4 callbacks on your presence module.
  """
  def init(_opts) do
    # user-land state
    {:ok, %{}}
  end

  def handle_metas("room:" <> room_id, %{joins: joins, leaves: leaves}, _presences, state) do
    for {user_id, _} <- joins do
      emit_joined(room_id, user_id)
    end

    for {user_id, _} <- leaves do
      emit_left(room_id, user_id)
    end

    {:ok, state}
  end

  def emit_left(room_id, user_id) do
    Xr.Utils.to_room_stream(room_id, "user_left", %{"user_id" => user_id})
  end

  def emit_joined(room_id, user_id) do
    
    default_rotation = [0, 0, 0, 1]

    default_user_state = %{
      "tag" => "avatar",
      "pose" => %{
        "head" => Rooms.get_head_position_near_spawn_point(room_id) ++ default_rotation
      },
      "user_id" => user_id
    }

    Xr.Utils.to_room_stream(room_id, "user_joined", default_user_state)

  end
end
```

handle_metas receives a map of user_ids that have joined or left and we can iterate through them and reshape them into "user_joined" and "user_left" events.  When we create the "user_joined" event, the payload includes the position and rotation of the head so that the front-end knows where to spawn the avatar.

To send messages to the Phoenix Pub/Sub topic, I added another convenience function to `Xr.Utils` module.  Add this function to `lib/xr/utils.ex`.

```elixir
  def to_room_stream(room_id, event_name, payload) do
    Phoenix.PubSub.broadcast(Xr.PubSub, "room_stream:#{room_id}", %{
      "event" => event_name,
      "payload" => payload
    })
  end
```

With this change in place, restart the server and view the debug console logs in the browser and you should see some entities_diff events whenever another client joins the channel or closes their browser.

### Share Camera Movement With Server

We've got the "user_joined" and "user_left" event going into our room_stream.  We still need to send the camera movements from the Babylon.js world as events into our room event stream.

#### Add avatar.ts

Let's add a new typescript file dedicated to handling the presence of avatars at `assets/js/systems/avatar.ts`.  First we need to create a new listener to listen whenever our camera moves then send a message to the room channel.

```typescript
import {
  Config,
} from "../config";

import {
  throttleTime,
  take,
  filter,
  skip,
  takeUntil,
  scan,
  map,
} from "rxjs/operators";
import { fromBabylonObservable, truncate } from "../utils";

// import { UniversalCamera } from "@babylonjs/core/Cameras/";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";

// how often to sync movement
export const MOVEMENT_SYNC_FREQ = 50; // milliseconds

const head_pos_rot = (cam: UniversalCamera) => {
  const position = truncate(cam.position.asArray());
  const rotation = truncate(cam.absoluteRotation.asArray());
  return position.concat(rotation);
};

export const init = (config: Config) => {
  
  const {
    scene,
    $channel_joined,
    channel,
  } = config;

  // subscribe just one time to the channel joined event
  // and create a new subscription that takes all camera movement,
  // throttles it, truncates the numbers and  sends it to the server
  $channel_joined.pipe(take(1)).subscribe(() => {
    // create a signal that the camera moved (this would be the non-xr camera)
    fromBabylonObservable(scene.activeCamera.onViewMatrixChangedObservable)
      .pipe(
        skip(3), // avoid some noise (feedback while setting camera to previous position)
        throttleTime(MOVEMENT_SYNC_FREQ),
      )
      .subscribe((cam) => {
        //$camera_moved.next(cam as UniversalCamera);
        channel.push("i_moved", {
          pose: { head: head_pos_rot(cam as UniversalCamera) },
        });
      });
  });



```

Babylon.js provides observables. See the 'onWhatever.add' pattern above?  These observables give us a way to trigger a callback function whenever that observable thing happens.  In this case `scene.activeCamera.onViewMatrixChangedObservable` is a Babylon.js observable we can subscribe to whenever the camera's position or direction changes.  We could directly do a `channel.push` from here but there are two issues.  The first issue is that there is a race condition.  We can't use `channel.push` if the channel is not joined.  That is why we created the `$channel_joined` RxJS Subject on the config object so that we could subscribe to when the channel is joined from any system.  The second issue is that it could be far too frequent to use `channel.push` every time the `onViewMatrixChangedObservable` is called since a camera can move every single frame of animation.  We'll throttle by a variable `MOVEMENT_SYNC_FREQ` for the number of milliseconds to wait between sending additional movement to the server.  Then we'll construct a message to send to `channel.push` in the form of `i_moved` event.  The `cam.position.asArray()` will produce too many significant digits.  The units of position are in meters.  That means if there are 2 significant digits after the decimal point then we have centemeter level precision.  Any further precision is not needed.

Add a truncate function at `assets/js/utils.ts`

```typescript
/**
 * Takes a float and cuts off significant digits
 * @param number 
 * @param places 
 * @returns 
 */
export const truncate = (numberOrArray: number | number[], places = 2) => {
  if (Array.isArray(numberOrArray)) {
    return numberOrArray.map(number => truncate(number, places))
  }
  let shift = Math.pow(10, places);
  return ((numberOrArray * shift) | 0) / shift;
}
```
Use this `truncate` function anytime we are passing floats or array of floats to the channel.

Remember to add this new `avatar` system to the `orchestrator.ts` otherwise this new file is unreachable.

```typescript
import * as Avatar from "./systems/avatar";

....

     Avatar.init(config)

```


### Fix Race Condition

There is a race condition whenever we try to execute a `channel.push` because we'll get an error if the channel has not yet successfully joined.  To fix this issue we should wait until the channel has properly joined the room before creating this listener.  We also want to make sure this listener isn't bound more than once, incase the channel reconnects itself etc.

### RxJS Subject For Channel Join Event

Remember when we added RxJS to the code base and defined some Subjects on the Config type in the `config.ts` file?  Now's our chance to use it.

In `broker.ts` in the code where we join the channel, let's send a signal that the channel was joined:

```typescript


channel
    .join()
    .receive("ok", (resp) => {
      console.log("Joined successfully", resp);
      // this alerts any subscribers of $channel_joined Subject that we've officially joined the channel
      config.$channel_joined.next(true);
    })
    .receive("error", (resp) => {
      console.log("Unable to join", resp);
    });
```

Back in `avatar.ts` we listen for that event, but pipe it and use the `take(1)` operator so that we only create one subscription no matter how many times we receive the $channel_joined event.

### Handle Movement In RoomChannel

Now we'll be getting "i_moved" channel events in the RoomChannel.  Update `room_channel.ex` with this handler:

```elixir
  def handle_in("i_moved", payload, socket) do
    Xr.Utils.to_room_stream(
      socket.assigns.room_id,
      "user_moved",
      Map.put(payload, "user_id", socket.assigns.user_id)
    )

    {:noreply, socket}
  end

```
This handler forwards "i_moved" events into "user_moved" events in the room_stream.  Now we should be receiving a complete set of user events in our rooom_stream: "user_joined", "user_left", "user_moved".



### Respond to entities_diff in the Frontend

Our frontend should be receiving "entities_diff" event now whenever a client joins, leaves or moves in a room.  Now we need to transform the "entities_diff" event into a format that is easy for systems to filter for just the component_names (or values) they are interested in.

I created a `EntityPayload` type to `config.ts` to describe the channel subscriptions more succinctly.

```typescript
export type EntityPayload = { [entity_id: string]: { [component_name: string]: any; }; };
```

Modified `broker.ts`:  

```typescript


  channel.on("entities_diff", (payload: { creates: EntityPayload, updates: EntityPayload, deletes: EntityPayload; }) => {
    for (const [entity_id, components] of Object.entries(payload.creates)) {
      $state_mutations.next({ op: StateOperation.create, eid: entity_id, com: components });
    }
    for (const [entity_id, components] of Object.entries(payload.updates)) {
      const prev = state.get(entity_id) || {};
      $state_mutations.next({ op: StateOperation.update, eid: entity_id, com: components, prev });
    }
    for (const [entity_id, components] of Object.entries(payload.deletes)) {
      const prev = state.get(entity_id) || {};
      $state_mutations.next({ op: StateOperation.delete, eid: entity_id, com: components, prev });
    }
  });

```
The "entities_diff" event comes in groups of creates, updates and deletes, so we know the operation.  This way components can listen for the type of operation in the event.  

In the receiving system, say we want to match when an avatar is deleted.  We'll want to use the `componentExists` function to see if the `StateMutation` has a component name "tag" = "avatar" in the components object.  However, we won't successfully match unless we make a slight tweak because on a delete situation our payload hardly includes any components at all.  And the same is true for entity update mutations, because the event will only include the components that were updated, which may not include the components it was originally created with, like "tag" = "avatar.  

Therefore we need a frontend cache of the state.  That way we can look up the previous state right before we change it and then send the current component and also previous components to any subscribers.  

That's what this line does.
```typescript
const prev = state.get(entity_id) || {};
```
Then we extend the `StateMutation` type to have a `prev` attribute:

```typescript
export type StateMutation = {
  op: StateOperation;
  eid: string;
  com: {
    [component_name: string]: any;
  };
  prev: {
    [component_name: string]: any;
  };
};
```

And we modify `componentExists` function to match component_name or value either within the `com` object or the `prev` object:

```typescript
export const componentExists = (component_name: string, component_value?: any) => {
  return (evt: StateMutation) => {
    if (component_value != undefined) {
      // only simple equality on primitives, no objects or arrays
      return evt.com[component_name] === component_value || (evt.prev[component_name] === component_value);
    }
    return evt.com[component_name] !== undefined || (evt.prev[component_name] !== undefined);
  };
};
```

Now let's add a simple Map database.  Create file `assets/js/systems/state.ts`:


```typescript
import { StateOperation, Config } from "../config";

export const init = (config: Config) => {

  const { $state_mutations, state } = config;

  // keep state updated

  $state_mutations.subscribe((evt) => {
   
    if (evt.op === StateOperation.create) {
      state.set(evt.eid, evt.com);

    } else if (evt.op === StateOperation.update) {
      const prev = state.get(evt.eid) || {};
      state.set(evt.eid, { ...prev, ...evt.com });

    } else if (evt.op === StateOperation.delete) {
      state.delete(evt.eid);
    }
  });

};

```

Remember to initialize this State system in the `orchestrator.ts` as well.

```typescript
import * as State from "./systems/state";
...
  Broker.init(config);
  State.init(config);
  MeshBuilder.init(config);
  Position.init(config);
  Avatar.init(config);
  Color.init(config);

  for (const [entity_id, components] of Object.entries(opts.entities)) {
      config.$state_mutations.next({ op: StateOperation.create, eid: entity_id, com: components, prev: {} });
  }
```

### Create Simple Avatar Mesh

Back in `avatar.ts` let's create some subscriptions on `$state_mutations`.

```typescript

  // user_joined
  $state_mutations.pipe(
    filter(e => e.op === StateOperation.create),
    filter(componentExists("tag", "avatar")),
  ).subscribe(e => {
    if (e.eid === config.user_id) {
      // the user_joined event contains spawn point, set the camera there
      const cam = scene.activeCamera as FreeCamera;
      cam.position.fromArray(e.com.pose.head.slice(0, 3));
      cam.rotationQuaternion = Quaternion.FromArray(e.com.pose.head.slice(3));
      return;
    }
    createSimpleUser(e.eid, e.com.pose);
  });

  // user_left
  $state_mutations.pipe(
    filter(e => e.op === StateOperation.delete),
    filter(componentExists("tag", "avatar")),
  ).subscribe(e => {
    removeUser(e.eid);
  });

  // user_moved
  $state_mutations.pipe(
    filter(e => e.op === StateOperation.update),
    filter(e => e.eid !== config.user_id),
    filter(componentExists("tag", "avatar")),
  ).subscribe(e => {
    console.log("other user moved");
    if (!cache.has(e.eid)) {
      createSimpleUser(e.eid, e.com.pose);
    }
    poseUser(e.eid, e.com.pose);
  });

  const headId = (user_id: string) => `${user_id}:head`;

  const removeUser = (user_id: string) => {
    const head = cache.get(headId(user_id));
    if (head) {
      head.dispose();
      cache.delete(headId(user_id));
    }
  };



  const createSimpleUser = (user_id: string, pose: { head: number[]; }) => {


    let head = cache.get(headId(user_id));
    if (!head) {
      head = CreateBox(headId(user_id), { width: 0.15, height: 0.3, depth: 0.25 }, scene);
      cache.set(headId(user_id), head);
      poseUser(user_id, pose);
    }

  };

  const poseUser = (user_id: string, pose: { head: number[]; }) => {
    const head = cache.get(headId(user_id));
    if (!head) { return; }
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

  };

```

You should be able to test this two browser windows.  Use the mouse to click and drag to move the camera, use the cursor keys to navigate.  You should be able to see each other represented as a small white rectangular box.

### Summary

In this chapter we produced room events related to a user joining, leaving and moving.  First used Phoenix.Presence module to generate user_joined and user_left room events.  We used the `mix phx.gen.presence` generator to create the presence file.  We added its module to Applications.ex so it would start automatically.  We included it in RoomChannel so we started tracking users with Phoenix Presence.  Then we implemented a handle_metas callback in Phoenx Presence module so we should shape the events to our satisfaction and publish a message to our room_stream.  Then in the frontend we added an avatar system.  To produce movement data to the server, the avatar system listens to camera movements then sends position and rotation data to the RoomChannel.  The room channel reshapes that data into a room event and pipes that message into the room_stream Phoenix PubSub, which will be converted to "entities_diff" message as well as persisted to the database.  The avatar system needs to be able to listen to when specific components have changed.  To support this, the front end added another system called `state` in order to enrich messages with all the full set of components related to an event.  In the avatar system we also created other listeners for the specific avatar related components and then created functions to create a box when a user joins, remove the box when the user leaves and move the box when the user moves.
