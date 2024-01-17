
### Phoenix Presence handle_metas Callback

Now that we have a fast in-memory database for user states let's return to the task of emiting our events for user joins and leaves.

It turns out Phoenix Presence provides callback that we can add to our `channels/presence.ex` that will get triggered everytime a client joins or leaves the room.  From that callback we could shape the kind of event that we want and send it into our room_stream.  Remember that our room_stream is our one destination for all our room events so every thing that happens in the room goes there and we'll figure out what to do with it later inside other GenServers that subscribe to the stream.

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

  alias Phoenix.PubSub
  alias Xr.Servers.UserSnapshot
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
      # if we have previous user state data, then broadcast it
      case UserSnapshot.get_user_state(room_id, user_id) do
        nil ->
          emit_join_at_spawn_point(room_id, user_id)

        user_state ->
          emit_join_from_previous_state(room_id, user_id, user_state)
      end
    end

    for {user_id, _} <- leaves do
      emit_left(room_id, user_id)
    end

    {:ok, state}
  end

  def emit_left(room_id, user_id) do
    PubSub.broadcast(Xr.PubSub, "room_stream:#{room_id}", %{
      "event" => "user_left",
      "payload" => %{
        "user_id" => user_id
      }
    })
  end

  def emit_join_at_spawn_point(room_id, user_id) do
    PubSub.broadcast(Xr.PubSub, "room_stream:#{room_id}", %{
      "event" => "user_joined",
      "payload" => %{
        "user_id" => user_id,
        "position" => Rooms.get_head_position_near_spawn_point(room_id),
        "rotation" => [0, 0, 0, 1]
      }
    })
  end

  def emit_join_from_previous_state(room_id, user_id, %{
        "position" => position,
        "rotation" => rotation
      }) do
    PubSub.broadcast(Xr.PubSub, "room_stream:#{room_id}", %{
      "event" => "user_joined",
      "payload" => %{
        "user_id" => user_id,
        "position" => position,
        "rotation" => rotation
      }
    })
  end
end

```

handle_metas receives a map of user_ids that have joined or left and we can iterate through them and reshape them into "user_joined" and "user_left" events.  The user_joined has two scenarios, we either have some memory in the ETS table from before, or have no data at all in which case we load the position from the room's spawn point.  We can't test this in the front-end yet because these messages are being sent to the room_stream, which isn't going to the front-end.  To send messages to the front-end we need to use the `XrWeb.Endpoint.broadcast` method and send it to the `room:#{room_id}` topic because that's what the client is subscribed to.

### Tidy-up Broadcast Functions

The above broadcast code to PubSub is looking a little verbose and we need to write the topic and create the map everytime.  Let's add a little function helper to wrap up some of the redundant parts so we can clean this up a bit.

Create a new file at `lib/xr/events.ex` with the following code:

```elixir
defmodule Xr.Events do
  defstruct [:room_id, :event_name, :payload]

  alias Phoenix.PubSub

  # simple way to create a struct without having to write a map and allow chainable broadcasts
  def event(room_id, event_name, payload) when is_map(payload) do
    %__MODULE__{room_id: room_id, event_name: event_name, payload: payload}
  end

  # broadcasts an event to the room stream
  def to_room_stream(%__MODULE__{} = event) do
    PubSub.broadcast(Xr.PubSub, "room_stream:#{event.room_id}", %{
      "event" => event.event_name,
      "payload" => event.payload
    })

    event
  end

  # broadcasts an event to the front-end client
  def to_client(%__MODULE__{} = event) do
    XrWeb.Endpoint.broadcast("room:#{event.room_id}", "stoc", %{
      "event" => event.event_name,
      "payload" => event.payload
    })

    event
  end
end

```

This allows us to write slightly less boiler plate and we can also chain operations like this:

```elixir
import Events
event("my_room", "i_moved", %{}) |> to_room_stream() |> to_client()
```
Let's update `presence.ex` using these helper functions (remember to `import Xr.Events`):

```elixir
  def emit_left(room_id, user_id) do
    event(room_id, "user_left", %{"user_id" => user_id})
    |> to_room_stream()
  end

  def emit_join_at_spawn_point(room_id, user_id) do
    event(room_id, "user_joined", %{
      "user_id" => user_id,
      "position" => Rooms.get_head_position_near_spawn_point(room_id),
      "rotation" => [0, 0, 0, 1]
    })
    |> to_room_stream()
  end

  def emit_join_from_previous_state(room_id, user_id, %{
        "position" => position,
        "rotation" => rotation
      }) do
    event(room_id, "user_joined", %{
      "user_id" => user_id,
      "position" => position,
      "rotation" => rotation
    })
    |> to_room_stream()
  end
```

### Share Camera Movement With Server

We've got the "user_joined" and "user_left" event going into our room_stream.  We still need to send the camera movements from the Babylon.js world as events into our event stream.

#### Add avatar.ts

Let's add a new typescript file dedicated to handling the presence of avatars at `assets/js/systems/avatar.ts`.  First we need to create a new listener to listen whenever our camera moves then send a message to the room channel.

```typescript
import { config } from "../config";

const { scene, channel } = config;

let lastSyncTime = 0;
const throttleTime = 200; // ms
// when the camera moves, push data to channel but limit to every 200ms
scene.activeCamera.onViewMatrixChangedObservable.add(cam => {
  console.log("camera moved");
  if (Date.now() - lastSyncTime > throttleTime) {
    config.channel.push("i_moved", {
      position: cam.position.asArray(),
      rotation: cam.absoluteRotation.asArray(),
    });
    lastSyncTime = Date.now();
  }
});
```

Remember to add this new `avatar` system to the `rooms.ts` otherwise this new file is unreachable.

```typescript
import "./systems/avatar";
```


Babylon.js provides observables. See the 'onWhatever.add' pattern above?  These observables give us a way to trigger a callback function whenever that observable thing happens.  In this case whenever the camera view matrix changes, we push the camera position and rotation data to the channel.  

### Fix Race Condition

There is a race condition here though because there is a chance that initializing the camera invokes the callback and tries to push a message on the channel before the channel has had a chance to join the room.  To fix this issue we should wait until the channel has properly joined the room before creating this listener.  We also want to make sure this listener isn't bound more than once, incase the channel reconnects itself etc.

### RxJS Subject For Channel Join Event

Remember when we added RxJS to the code base and created some Subjects in the `config.ts` file?  Now's our chance to use it.

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

Now back in `avatar.ts` we can listen for that event, but pipe it and wrangle it so that we only create one subscription no matter how many times we receive the $channel_joined event.

Here is the updated `avatar.ts` with RxJs subscriptions, including one for camera movement. 

```typescript
import { config } from "../config";
import { Quaternion, TransformNode } from "@babylonjs/core";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { filter, throttleTime, take } from "rxjs/operators";

const { scene } = config;


// take(1) will only take one event off of the bus
config.$channel_joined.pipe(take(1)).subscribe(() => {
  config.$camera_moved.pipe(throttleTime(200)).subscribe(() => {
    const cam = scene.activeCamera;
    config.channel.push("i_moved", {
      position: cam.position.asArray(),
      rotation: cam.absoluteRotation.asArray(),
    });
  });
});

scene.activeCamera.onViewMatrixChangedObservable.add(cam => {
  config.$camera_moved.next(new Date().getTime());
});


```


### Handle Movement In RoomChannel

Now we'll be getting "i_moved" channel events in the RoomChannel.  Update `room_channel.ex` with this handler and remember to import `Xr.Events` for the new helper functions we made earlier:

```elixir
  ...
  import Xr.Events
  ...

  def handle_in("i_moved", %{"position" => position, "rotation" => rotation}, socket) do
    event(socket.assigns.room_id, "user_moved", %{
      "user_id" => socket.assigns.user_id,
      "position" => position,
      "rotation" => rotation
    })
    |> to_room_stream()

    {:noreply, socket}
  end
```
This handler forwards "i_moved" events into "user_moved" events in the room_stream.  Now we should be receiving a complete set of user events in our rooom_stream: "user_joined", "user_left", "user_moved".

### Reflect Events to the Frontend

The point of sending all events to a room_stream is that we can decide what to do when them decoupled from the sender.  We already have one UserSnapshot Genserver that is subscribed to the stream and caching movement data for all users that move.  But right now our front-end isn't receiving any of these messages from the server.  Let's fix that now by adding another GenServer that will simply reflect the messages it receives in the room_stream back out to the clients so they can render something?  Later on we can add more logic to this GenServer to be more intelligent with how often it forwards data.  Perhaps we want to batch some of the data together before send it out, etc.

Add `lib/xr/servers/reflector.ex`

```elixir
defmodule Xr.Servers.Reflector do
  use GenServer
  alias Phoenix.PubSub
  import Xr.Events

  # creates a tuple that will automatically map a string "user_states:#{room_id}" to this new process
  def via_tuple(room_id) do
    {:via, Registry, {Xr.RoomsRegistry, "reflector:#{room_id}"}}
  end

  def start_link(room_id) do
    GenServer.start_link(__MODULE__, {:ok, room_id}, name: via_tuple(room_id))
  end

  @impl true
  def init({:ok, room_id}) do
    # subscribe to the room stream
    PubSub.subscribe(Xr.PubSub, "room_stream:#{room_id}")

    {:ok, %{room_id: room_id}}
  end

  # responds to incoming message from the room stream and reflects it out to the client
  @impl true
  def handle_info(%{"event" => event_name, "payload" => payload}, state) do
    event(state.room_id, event_name, payload)
    |> to_client()

    {:noreply, state}
  end
end

```

### Add Reflector To Supervisor

Add this new GenServer under the same supervisor.  Open up `lib/xr/servers/rooms_supervisor` and update the start_room and stop_room functions.

```elixir
  def start_room(room_id) do
    DynamicSupervisor.start_child(__MODULE__, {Xr.Servers.UserSnapshot, room_id})
    DynamicSupervisor.start_child(__MODULE__, {Xr.Servers.Reflector, room_id})
  end

  def stop_room(room_id) do
    DynamicSupervisor.terminate_child(
      __MODULE__,
      Xr.Servers.UserSnapshot.via_tuple(room_id) |> GenServer.whereis()
    )

    DynamicSupervisor.terminate_child(
      __MODULE__,
      Xr.Servers.Reflector.via_tuple(room_id) |> GenServer.whereis()
    )
  end
```

We just added another supervised GenServer to do a different kind of action on the same room_stream.  This pattern will allow us to just create another GenServer whenever we want to pull and manipulate the room_stream data in some new way.

Now we should be getting all the messages that come to room_stream forwarded to the client under the event "stoc" (server to client) or even better (stream to client) event name.

### Broker Subscribe to "stoc" Events.

Back in our `broker.ts` we need to listen for "stoc" events and let's just redirect that into an RxJS Subject for more powerful filtering capabilities.

```typescript
channel.on("stoc", (event) => {
  config.$room_stream.next(event);
});
```

### Create Simple Avatar Mesh

Back in `avatar.ts` let's create some subscriptions over the "user_joined", "user_moved", "user_left" events we can now get from the $room_stream Subject and draw a very simple box to represent a user's avatar.

```typescript
// reacting to incoming events to draw other users, not self

// user_joined
config.$room_stream.pipe(
  filter(e => e.event === "user_joined"),
  filter(e => e.payload.user_id !== config.user_id),
).subscribe(e => {
  createSimpleUser(e.payload.user_id, e.payload.position, e.payload.rotation);
});

// user_left
config.$room_stream.pipe(
  filter(e => e.event === "user_left"),
  filter(e => e.payload.user_id !== config.user_id)
).subscribe(e => {
  removeUser(e.payload.user_id);
});

// user_moved
config.$room_stream.pipe(
  filter(e => e.event === "user_moved"),
  filter(e => e.payload.user_id !== config.user_id)
).subscribe(e => {
  poseUser(e.payload.user_id, e.payload.position, e.payload.rotation);
});

const removeUser = (user_id: string) => {
  const user = scene.getTransformNodeByName(user_id);
  if (user) {
    user.dispose();
  }
};

const createSimpleUser = (user_id: string, position: number[], rotation: number[]) => {
  if (user_id !== config.user_id) {
    const user = scene.getTransformNodeByName(user_id);
    if (!user) {
      const transform = new TransformNode(user_id, scene);
      const box = CreateBox("head");
      box.parent = transform;
      poseUser(user_id, position, rotation);
    }
  }
};

const poseUser = (user_id: string, position: number[], rotation: number[]) => {
  const transform = scene.getTransformNodeByName(user_id);
  if (transform) {
    transform.position.fromArray(position);
    if (!transform.rotationQuaternion) { transform.rotationQuaternion = Quaternion.FromArray(rotation); } else {
      transform.rotationQuaternion.x = rotation[0];
      transform.rotationQuaternion.y = rotation[1];
      transform.rotationQuaternion.z = rotation[2];
      transform.rotationQuaternion.w = rotation[3];
    }
  }
};
```

### Handle Late-comers Using Presence.list

If you test this now in two browsers (or same browser with other tab incognito), you will notice that the first window to connect to the channel will be able to see the second user that joins.  But the second user that joins doesn't get a "user_joined" message regarding the first user because that message was sent before they arrived so they missed it.

We'll fix this in a similar way to how we're sending a "snapshot" message for all objects in the room.  We similarly need to send a snapshot for all the active users in the room when they first connect.

In `room_channel.ex` implement a helper function to get all the user_states from user_ids that are in `Presence.list`, which is an object with user_id keys.

```elixir
  def user_snapshot(socket) do
    user_states = UserSnapshot.all_user_states(socket.assigns.room_id)

    Presence.list(socket)
    |> Enum.reduce(%{}, fn {user_id, _}, acc ->
      Map.put(acc, user_id, user_states[user_id])
    end)
  end
```

Then push it to the channel in the `after_join` handler.

```elixir
  def handle_info(:after_join, socket) do
    {:ok, _} = Presence.track(socket, socket.assigns.user_id, %{})

    entities = Xr.Rooms.entities(socket.assigns.room_id)
    push(socket, "snapshot", entities)
    push(socket, "user_snapshot", user_snapshot(socket))
    {:noreply, socket}
  end
```

Finally let's handle this event in `avatar.ts`

```typescript
config.channel.on("user_snapshot", (payload: { user_id: string, position: number[], rotation: number[]; }[]) => {
  Object.entries(payload).forEach(([user_id, state]) => {
    if (user_id !== config.user_id) {
      createSimpleUser(user_id, state.position, state.rotation);
    }
  });
});
```