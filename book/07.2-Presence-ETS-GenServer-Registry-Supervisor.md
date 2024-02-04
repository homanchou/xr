
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

Create a new entity called `spawn_point` in the `generate_random_content` function:

```elixir
    # create spawn_point
    create_entity(room_id, Ecto.UUID.generate(), %{
      "spawn_point" => true,
      "position" => [Enum.random(-10..10), 0.1, Enum.random(-10..10)]
    })
```
We'd like to re-use common component names if they represent the same idea, so we are re-using the "position" component.  We also need to be able to somehow tag or label this entity as a "spawn_point".  Since the entity itself is just an id with no other information, all data is stored in some kind of component so we added a "spawn_point" = true component just so we can find this entity later by one of its component names.

The spawn_point for now is just a random point in 3D space between -10 and 10 on the x and z axis and slightly above y = 0 which is a common place to put the floor.  We may change this later for multi-leveled rooms.

Let's add a convenience function for filtering entities for a room by component names.

```elixir
  def find_entities_having_component_name(room_id, component_name) do
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

Let's also add a function to grab a position vector near a spawn point.  We add a little randomness so that when the server hands out positions near a spawn_point hopefully the users don't end up exactly on top of each other so they have a better chance of seeing each other when they look left or right when arriving at the same time.

```elixir
  def get_head_position_near_spawn_point(room_id) do
    # grab the entities that have spawn_point as a component
    entities_map = Xr.Rooms.find_entities_having_component_name(room_id, "spawn_point")

    # grabs position from first spawn_point's position component
    {_entity_id, %{"position" => [x, y, z]}} =
      entities_map |> Enum.find(fn {_k, v} -> %{"position" => _} = v end)

    # randomly calculate a position near it where the player head should be
    offset1 = :rand.uniform() * 2 - 1
    offset2 = :rand.uniform() * 2 - 1
    [x + offset1, y + 2, z + offset2]
  end
```

You can clear all the rooms in the database you've created so far by stopping your server and running `mix ecto.reset`.  That will recreate and migrate all the tables.  Then start your server and create some new rooms, each new room created will have a spawn_point from now on

We can test these new functions in the `iex` terminal:

```elixir
> alias Xr.Rooms
> room_id = "895cc3f6-1360-4ae0-acbf-29f03907f1b6"
> Rooms.find_entities_having_component_name(room_id, "spawn_point")
%{
  "26ecb8e0-774e-4764-a4a7-d6025c308037" => %{
    "position" => [-2, 0.1, 7],
    "spawn_point" => true
  }
}

> Rooms.get_head_position_near_spawn_point(room_id)
[-1.0802579661399285, 2, 7.9967831898518575]
> Rooms.get_head_position_near_spawn_point(room_id)
[-2.1414205495000918, 2, 6.251404238600888]
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
  push(socket, "snapshot", entities)
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
presence_diff {joins: {"39jfks9...": ...}, leaves: {}}
```
 

Although this message is triggered at all the right times, it's not providing the event message shape that we want so we won't be making use of `presence_diff`.  We'll look into how we can reshape the Phoenix Presence messages later.  But before we work on that, we first need a database of user states.  Because remember, our custom events also need to tell us where a user is the moment they join a room.

### Create ETS Table for User Snapshot

We already have a Postgres database for room entities like obstacles and our spawn_point.  We can consider placing information about users in that database too however I decided against it.  I'm making the distinction that the Postgres database is about stuff in the room, like objects and environment and users are treated differently.  

The environment is usually slow to change.  It's loaded once and then seldom modified during game play.  And even if it's modified, those changes may want to be stored separately too so that the game can be reset to its original state without mixing the updates with the original setting.

Users are updated constantly.  Users are coming and going and dropping off because of network issues etc.  If you're wearing a head-mounted-display (HMD) it generates a near constant stream of subtle position and rotation updates even if you do your best to hold your head still.  These are transient data, don't impact the environment but are important for a social reason.  For that, we need a very fast database that is going to be hammered upon.

Elixir is based on Erlang and Erlang comes with a fast in-memory database called Erlang-Term-Storage (ETS).  Here are the basics:

To create a new ETS Table we do this:

```elixir
table = :ets.new(:some_atom, [:set, :public, {:write_concurrency, true},{:read_concurrency, true}])
```

The configuration above creates an ETS table that has:

- unique keys (desirable because every user_id is unique)
- is writable by all processes (in case we want to allow other processes to write to it)
- concurrent on reads and writes so multiple processes can access the data simultaneously

To insert data the API requires the table reference and a tuple of {key, value}

```elixir
> :ets.insert(table, {"key", %{}})
true
```

To lookup a value, we use the key:
```elixir
> :ets.lookup(table, "key")
[{"key", %{}}]
```
It returns a list of tuples of key and value.

You can get the whole table as a list of tuples of key and value:

```elixir
>:ets.tab2list(table)
[{"key", %{}}, ...]
```

An ETS table is linked to the process that created it.  So if the parent process dies or is shutdown than the child will be shutdown and memory reclaimed as well.  In order to access the ETS table we need to have its reference which was returned when it was created.  

Now we just need to figure out where and how we should go about creating the ETS table per unique room.

### Create a Server for the ETS Table

Let's create a small server that specializes in storing data about each connected user.  A GenServer is perfect for hosting a small specialized API with some state and we can dynamically start and stop these servers.  The plan is to have a unique user snapshot server per room that is storing location or other state about each user in that particular room.

We will build this up step by step.  Create a new file in `lib/xr/server/user_snapshot.ex` and paste this code to create a minimal GenServer.  

```elixir
defmodule Xr.Servers.UserSnapshot do
  use GenServer

  def start_link() do
    GenServer.start_link(__MODULE__, [])
  end

  @impl true
  def init([]) do
    {:ok, %{}}
  end

end
```

Here's a quick overview with what we can do with that GenServer already.  We can go to our terminal after starting `iex -S mix phx.server` and start an instance of this GenServer.

```elixir
>Xr.Servers.UserSnapshot.start_link()
{:ok, #PID<0.524.0>}
```

We now have a tiny server!  That pid is the process id of our server.  If we pattern match it we can deconstruct the pid and check it's state.

```elixir
>{:ok, pid} = Xr.Servers.UserSnapshot.start_link()
{:ok, #PID<0.525.0>}
>:sys.get_state(pid)
%{}
```

The state is an empty map as expected because that was the state we returned in the `init` function.  We will replace the state with an ETS table soon, but first let's fix an issue with our server.

### Add Local Registry for Unique GenServer Names

This GenServer is un-named right now, so we can't talk to it unless we have its pid.  But let's say we don't know its pid and we'd like to lookup this particular GenServer by a name.  A registry let's us do that.  The registry inserts a mapping between a name and a pid and also ensures that we won't accidentally start two of the same servers for the same room.  

Create a Registry by adding this line in the `applications.ex` children's list after the `Endpoint`:

```elixir
 {Registry, keys: :unique, name: Xr.RoomsRegistry},
```

The Registry is built in feature and it just works.  Now we can name each process that is created from UserSnapshot GenServer using the `via_tuple` API.  If you're not familiar with GenServers or via_tuple, the internet does a good explanation that I'll forego for now.

### Add ETS and Registry into UserSnapshot Module

Here is the final UserSnapshot module:

```elixir
defmodule Xr.Servers.UserSnapshot do
  use GenServer
  alias Phoenix.PubSub

  # creates a tuple that will automatically map a string "user_states:#{room_id}" to this new process
  def via_tuple(room_id) do
    {:via, Registry, {Xr.RoomsRegistry, "user_states:#{room_id}"}}
  end

  def start_link(room_id) do
    GenServer.start_link(__MODULE__, {:ok, room_id}, name: via_tuple(room_id))
  end

  # client api to get user state
  def get_user_state(room_id, user_id) do
    GenServer.call(via_tuple(room_id), {:get_user_state, user_id})
  end

  # client api to get all user states, return a maps of user_ids to state
  def all_user_states(room_id) do
    GenServer.call(via_tuple(room_id), :all_user_states)
  end

  @impl true
  def init({:ok, room_id}) do
    # subscribe to the room stream
    PubSub.subscribe(Xr.PubSub, "room_stream:#{room_id}")

    # create an ets table
    table =
      :ets.new(:user_states, [
        :set,
        :public,
        {:write_concurrency, true},
        {:read_concurrency, true}
      ])

    {:ok, table}
  end

  # responds to incoming message from the room stream
  @impl true
  def handle_info(%{"event" => "user_moved", "payload" => payload}, state) do
    # insert into the ets table asynchronously
    Task.start_link(fn ->
      :ets.insert(
        state,
        {payload["user_id"], Map.reject(payload, fn {k, _} -> k == "user_id" end)}
      )
    end)

    {:noreply, state}
  end

  # ignore all other incoming messages from the room stream
  @impl true
  def handle_info(_, state) do
    {:noreply, state}
  end

  # internal api to get user state
  @impl true
  def handle_call({:get_user_state, user_id}, _from, state) do
    result =
      case :ets.lookup(state, user_id) do
        [] -> nil
        [{_key, value}] -> value
      end

    {:reply, result, state}
  end

  # internal api to get all user states, returns a map of user_id to user_state
  def handle_call(:all_user_states, _from, state) do
    # get cache of movements
    list = :ets.tab2list(state)

    result =
      Enum.reduce(list, %{}, fn {key, value}, acc ->
        Map.put(acc, key, value)
      end)

    {:reply, result, state}
  end
end

```

There's a lot happening in there, but essentially we've written a server that creates an ETS table and also subscribes that GenServer process to a PubSub topic called "room_stream:#{room_id}".  If events are broadcast onto that topic, this server will receive an incoming message and store user movement into its ETS table.  The server also provides some public apis to support the ability to query for a particular user or to all users it has in its ETS database.

Let's take it out for a spin.  Restart the server and terminal and try the following commands and observe their output:

```elixir
> alias Phoenix.PubSub
Phoenix.PubSub
> alias Xr.Servers.UserSnapshot
Xr.Servers.UserSnapshot
> Xr.Servers.UserSnapshot.start_link("abc")
{:ok, #PID<0.640.0>}
> PubSub.broadcast(Xr.PubSub, "room_stream:abc", %{"event" => "user_moved", "payload" => %{"position" => [1,2,3], "user_id" => "tom"}})
:ok
> UserSnapshot.get_user_state("abc", "tom")
%{"position" => [1, 2, 3], "user_id" => "tom"}
```

Cool!  In the above example we broadcast events to a room_stream topic and this little server was paying attention to events that look like `"event" => "user_moved"` and cached it so we could retrive it with an API call.  

The following example show how the Registry prevents us from starting the same server twice so we don't accidentally create more than one database.

```elixir
> Xr.Servers.UserSnapshot.start_link("hi")
{:ok, #PID<0.540.0>}
> Xr.Servers.UserSnapshot.start_link("hi")
{:error, {:already_started, #PID<0.540.0>}}
```

### Add Dynamic Supervisor

GenServers ought to be supervised so that if they crash they can be restarted.Let's add a supervisor for our UserSnapshot.  Create a new file at `lib/xr/servers/rooms_supervisor`

```elixir
defmodule Xr.Servers.RoomsSupervisor do
  use DynamicSupervisor

  def start_link(_arg) do
    DynamicSupervisor.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  def init(:ok) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  def start_room(room_id) do
    DynamicSupervisor.start_child(__MODULE__, {Xr.Servers.UserSnapshot, room_id})
  end

  def stop_room(room_id) do
    DynamicSupervisor.terminate_child(
      __MODULE__,
      Xr.Servers.UserSnapshot.via_tuple(room_id) |> GenServer.whereis()
    )
  end
end
```
When we use the start_room function, this RoomsSupervisor will create a new UserSnapshot GenServer as a child of itself.  This Supervisor can supervise multiple rooms.

```
             +----------+                  
         +---|Supervisor|--+               
         |   +----------+  |               
   +--------+       +--------+             
   | Room 1 |       | Room 2 |             
   | Child  |       | Child  |             
   +--------+       +--------+       
```

We want to start this supervisor automatically when Phoenix starts our application so add it to the bottom of the children list in `application.ex`.

```elixir
  children = [
    ....
    Xr.Servers.RoomsSupervisor
  ]
```

Now we can use the RoomsSupervisor to create our UserSnapshot GenServer when we launch into our room from the `show` function in the RoomsController.  Modify the show function like this:

```elixir
def show(conn, %{"id" => id}) do
  room = Rooms.get_room!(id)
  Xr.Servers.RoomsSupervisor.start_room(room.id)
  render(conn, :show, room: room)
end
```
This starts the UserSnapshot Genserver if it hasn't already started, and if it has it will silently fail.

