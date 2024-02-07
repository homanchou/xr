
## Presence

Virtual presence is the concept of being able to see each other online at the same time in a shared space.  The first events that we will work on will help us establish our avatar positions and rotations.  Our goal is to produce some events like this:

```
{event: "user_joined", payload: {user_id: "tom", position: [...], rotation: [...]}}
{event: "user_moved", payload: {user_id: "tom", position: [...], rotation: [...]}}
{event: "user_left", payload: {user_id: "tom"}}
```
This way as soon as someone joins the room, we know where to draw them.  And when someone moves we know where to move them.

### Joining Needs a Position

Starting with the "user_joined" event, it makes sense that when we join a room we first appear in a location that is dictated by the kind of environment the room is hosting.  Thus far we've hardcoded our camera at a fixed location in the scene like security camera overseeing everything.  But just like the other entities that a room stores about itself stored in the components table, we ought to have one entity specifically purposed to tell us where the game starts.  This entity is called the spawn_point.

### Create Spawn Point Entity

Create a new entity called `spawn_point` in the `generate_random_content` function in `rooms.ex`:

```elixir
    # create spawn_point
    create_entity(room_id, Xr.Utils.random_string(), %{
      "tag" => "spawn_point",
      "position" => [Enum.random(-10..10), 0.1, Enum.random(-10..10)]
    })
```
We'd like to re-use common component names if they represent the same idea, so we are re-using the "position" component.  We also need to be able to somehow tag (aka label) this entity as a "spawn_point".  Since the entity itself is just an id with no other information, all data is stored in some kind of component so we added a "spawn_point" tag just so we can find this entity later by one of its component names.

The spawn_point for now is just a random point in 3D space between -10 and 10 on the x and z axis and slightly above y = 0 which is a common place to put the floor.  We may change this later for multi-leveled rooms.

Let's add some convenience functions for finding entities that have a particular component or component equal to a value.

```elixir
  def find_entities_having_component(room_id, component_name, component_value) do
    q =
      from(c in Xr.Rooms.Component,
        where:
          c.room_id == ^room_id and c.component_name == ^component_name and
            c.component[^component_name] == ^component_value,
        select: c.entity_id
      )

    from(c in Xr.Rooms.Component,
      where: c.room_id == ^room_id and c.entity_id in subquery(q)
    )
    |> Repo.all()
    |> components_to_map()
  end

  def find_entities_having_component(room_id, component_name) do
    q =
      from(c in Xr.Rooms.Component,
        where: c.room_id == ^room_id and c.component_name == ^component_name,
        select: c.entity_id
      )

    from(c in Xr.Rooms.Component,
      where: c.room_id == ^room_id and c.entity_id in subquery(q)
    )
    |> Repo.all()
    |> components_to_map()
  end

```

Let's also add a convenience function for looking up the spawn point and getting a location near a spawn_point.  This is useful for assigning positions to players when they join a room without them piling directly on top of each other:

```elixir
  def get_head_position_near_spawn_point(room_id) do
    # grab the entities that have spawn_point as a component
    entities_map = Xr.Rooms.find_entities_having_component(room_id, "tag", "spawn_point")

    # grabs position from first spawn_point's position component
    {_entity_id, %{"position" => [x, y, z]}} =
      entities_map |> Enum.find(fn {_k, v} -> %{"position" => _} = v end)

    # randomly calculate a position near it where the player head should be
    offset1 = Enum.random(-100..100) / 100
    offset2 = Enum.random(-100..100) / 100
    [x + offset1, y + 2, z + offset2]
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

    entity = Rooms.find_entities_having_component(room.id, "tag")
    assert entity |> Map.keys() |> Enum.count() == 1
    assert entity |> Map.values() |> List.first() |> Map.keys() |> Enum.count() == 2
  end

  test "find entities by component name and value" do
    room = room_fixture()

    Rooms.create_entity(room.id, Xr.Utils.random_string(5), %{
      "tag" => "spawn_point",
      "position" => [0, 0, 0]
    })

    entity = Rooms.find_entities_having_component(room.id, "tag", "spawn_point")
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
```

Now that our room contains the concept of a spawn_point, we'll be able to use it when we emit our user_joined event.

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
    case Rooms.get_entity_state(room_id, user_id) do
      nil ->
        default_user_state = %{
          "color" => Xr.Rooms.create_random_color(),
          "tag" => "avatar",
          "rotation" => [0, 0, 0, 1],
          "position" => Rooms.get_head_position_near_spawn_point(room_id),
          "user_id" => user_id
        }

        Xr.Utils.to_room_stream(room_id, "user_joined", default_user_state)

      components ->
        # resume previous user state
        Xr.Utils.to_room_stream(room_id, "user_joined", Map.put(components, "user_id", user_id))
    end
  end
end
```

handle_metas receives a map of user_ids that have joined or left and we can iterate through them and reshape them into "user_joined" and "user_left" events.  The user_joined has two scenarios, we either have some memory in the ETS table from before, or have no data at all in which case we load the position from the room's spawn point.  We can't test this in the front-end yet because these messages are being sent to the room_stream, which isn't going to the front-end.  To send messages to the Phoenix Pub/Sub topic, I added another convenience function to `Xr.Utils` module.  Add this function to `lib/xr/utils.ex`.

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
import { Config } from "../config";
import { throttleTime, take } from "rxjs/operators";
import { truncate } from "../utils";

export const init = (config: Config) => {
  

  const { scene } = config;

  // create a signal that the camera moved
  scene.activeCamera.onViewMatrixChangedObservable.add(cam => {
    config.$camera_moved.next(true);
  });

  const MOVEMENT_SYNC_FREQ = 200; // milliseconds

  // subscribe just one time to the channel joined event
  // and create a new subscription that takes all camera movement, 
  // throttles it, truncates the numbers and  sends it to the server
  config.$channel_joined.pipe(take(1)).subscribe(() => {
    config.$camera_moved.pipe(throttleTime(MOVEMENT_SYNC_FREQ)).subscribe(() => {
      const cam = scene.activeCamera;
      const payload = {
        position: truncate(cam.position.asArray()),
        rotation: truncate(cam.absoluteRotation.asArray()),
      }
      config.channel.push("i_moved", payload);
    });
  });
}
```

Babylon.js provides observables. See the 'onWhatever.add' pattern above?  These observables give us a way to trigger a callback function whenever that observable thing happens.  In this case `scene.activeCamera.onViewMatrixChangedObservable` is a Babylon.js observable we can subscribe to whenever the camera's position or direction changes.  We could directly do a `channel.push` from here but there are two issues.  The first issue is that there is a race condition.  We can't use `channel.push` if the channel is not joined.  That is why we created the `$channel_joined` RxJS Subject on the config object so that we could subscribe to when the channel is joined from any system.  The second issue is that it could be far too frequent to use `channel.push` every time the `onViewMatrixChangedObservable` is called since a camera can move every single frame of animation.  We'll limit it by first pushing a signal (any kind of data really) into `config.$camera_moved`.  Then we'll create an RxJS pipe from `$camera_moved` and throttle it to a maximum sampling every `MOVEMENT_SYNC_FREQ`.  Then we'll construct a message to send to `channel.push` in the form of `i_moved` event.  The `cam.position.asArray()` will produce too many significant digits.  The units of position are in meters.  That means if there are 2 significant digits after the decimal point then we have centemeter level precision.  Any further precision is not needed.

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
  def handle_in("i_moved", %{"position" => position, "rotation" => rotation}, socket) do
    Xr.Utils.to_room_stream(socket.assigns.room_id, "user_moved", %{
      "user_id" => socket.assigns.user_id,
      "position" => position,
      "rotation" => rotation
    })

    {:noreply, socket}
  end
```
This handler forwards "i_moved" events into "user_moved" events in the room_stream.  Now we should be receiving a complete set of user events in our rooom_stream: "user_joined", "user_left", "user_moved".

### Respond to entities_diff in the Frontend

Our frontend should be receiving "entities_diff" event now whenever a client joins, leaves or moves in a room.  Now we need to draw something on the screen to represent an avatar.

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
This sends the current component and also previous components to any subscribers.  To do that we retain the history in a state.  Add a state.ts system:


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

### Create Simple Avatar Mesh

Back in `avatar.ts` let's create some subscriptions on `$state_mutations`.

```typescript

  // user_joined
  $state_mutations.pipe(
    filter(e => e.op === StateOperation.create),
    filter(e => e.eid !== config.user_id),
    filter(componentExists("tag", "avatar")),
    tap(e => console.log("tap ta", e)),
  ).subscribe(e => {
    createSimpleUser(e.eid, e.com.head_pos, e.com.head_rot);
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
    filter(componentExists("head_pos")),
  ).subscribe(e => {
    poseUser(e.eid, e.com.head_pos, e.com.head_rot);
  });


  const headId = (user_id: string) => `head_${user_id}`;

  const removeUser = (user_id: string) => {
    const head = cache.get(headId(user_id));
    if (head) {
      head.dispose();
      cache.delete(headId(user_id));
    }
  };



  const createSimpleUser = (user_id: string, head_pos: number[], head_rot: number[]) => {


    let head = cache.get(headId(user_id));
    if (!head) {
      head = CreateBox(headId(user_id), { width: 0.15, height: 0.3, depth: 0.25 }, scene);
      cache.set(headId(user_id), head);
      poseUser(user_id, head_pos, head_rot);
    }

  };

  const poseUser = (user_id: string, position: number[], rotation: number[]) => {
    let head = cache.get(headId(user_id));
    if (!head) { return; }
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

If you test this in two browser windows you should see a small rectangle representing a head.  You might notice however, that only the first browser to join the room can see the second client that joins the room and the second client cannot see the first client.  Why is that?  The reason is because the entities_state message doesn't include the users yet.  Our database was seeded with random colored boxes but we haven't yet reacted to new state mutations.  Therefore our clients only received information about users through entities_diff events.  And the first user to join is ready to receive the entities_diff event when the second user joins, but the second user never gets the entities_diff with the create key when the first user joined because that event was streamed before they entered the room.  If we update the database continuously with entities_diff events then it should have the most updated scene information for all clients at the moment they connect.

### Update Database with Entities Diff Events

