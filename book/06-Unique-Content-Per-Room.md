

## Simple Obstacles

Currently although we are rendering a 3D scene when we visit a room, it's the same exact scene for every room.  Let's create some different environments for each room we make.  At this point it doesn't need to be anything fancy, just something visual to distinguish one room from another.  Babylon.js allows importing detailed glft models created in Blender and other tools, but for now we can just use Babylon.js' built in MeshBuilder functions.

### Database Supplied Obstacles

In order to have different rooms created with different mesh geometry we'll create a database table that defines what kind of meshes the room has.  The database needs to define how many objects are in the room and where they are placed etc.

### Design a Snapshot Payload

In the Entity-Component-System (ECS) architecture, everything in the game is an entity.  And the data associated with the entities are components.

If we define a schema for entities and components it could look something like this:

```json
{
  "entity1": {"position": [...], "rotation": [...], "scaling": [...], "mesh_builder": ...},
  "entity2": {"position": [...], "rotation": [...], "scaling": [...], "mesh_builder": ...},
}
```

In the payload above, each key/value pair represents a "thing" and "data".  Each key is an entity_id (randomly generated id, and each value is a JSON object of components (data for the thing).  A component is just another key/value pair.  For example "position" is a component name with [1,2,3] as the component value.  Components are just data, and entities are just ids.  To make sense of the data we use Systems.  We already have a folder we have created for systems.  Each system listens for incoming messages and will react accordingly to change the scene.

There are lots of ways we could design the schema for a database to persist this data.  We could have an entities table and then a components table with each component record belonging to a record in the entities table.  However, since entities is only an id, there is basically no point in having the entities table.  So I'm opting for a simple single table that is just the components table.

### Create the Components Table

Let's create a database table to be able to store some meta data about simple background objects.  We can then query this table for any objects that are supposed to be in the room and then create them.  Execute this Phoenix generator command:

```bash
 mix phx.gen.schema Rooms.Component components room_id:references:rooms entity_id:string component_name:string component:map 
```

This will create two files, a schema and a migration:

```bash
* creating lib/xr/rooms/component.ex
* creating priv/repo/migrations/20240105030950_create_components.exs
```
Open the migration file and make it look like the following snippet.  

```elixir
defmodule Xr.Repo.Migrations.CreateComponents do
  use Ecto.Migration

  def change do
    create table(:components, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :entity_id, :string, null: false
      add :component_name, :string, null: false
      add :component, :map, null: false, default: %{}
      add :room_id, references(:rooms, on_delete: :delete_all, type: :string)
      timestamps(type: :utc_datetime)
    end

    create index(:components, [:entity_id, :component_name], unique: true)
  end
end

```
The id is a random UUID that the database will generate for us.  However we won't be using it much, because we'll use the entity_id and component_name normally to update a component.  The component field is a map type which means we must store a key/value pair but it gives us flexibility to store any kind of type for the value.  

The index ensures that a particular entity can only have one component of the same name.

Run `mix ecto.migrate` to run the migration and create the table.

### Add Functions To Create and Query Entities for a Room

Let's make ourselves a helper function to create an entity from a map:

```elixir

  @doc """
  Insert entity from a map.  Our entities table actually contains individual components so we'll loop through
  the components map and insert an entity record for each pair.
  """
  def create_entity(room_id, entity_id, components = %{}) do
    # loop through components
    for {component_name, component_value} <- components do
      %Xr.Rooms.Component{
        room_id: room_id,
        entity_id: entity_id,
        component_name: component_name,
        component: %{component_name => component_value}
      }
      |> Xr.Repo.insert!()
    end
  end
```
This function loops through each component key/value pair in the given map and individually inserts those components into the components table.
We'll also create some functions to retrieve the entities back from the database:

```elixir
  @doc """
  Get all components for a room, sorted by entity_id so all components for entities are next to each other
  """
  def components(room_id) do
    Repo.all(from e in Xr.Rooms.Component, where: e.room_id == ^room_id, order_by: e.entity_id)
  end

  @doc """
  Get a map of entities and their components for a room
  """
  def entities(room_id) do
    components(room_id)
    |> components_to_map()
  end

  @doc """
  given a list of components, build a map of entity key to components map
  """
  def components_to_map(components) when is_list(components) do
    components
    |> Enum.reduce(%{}, fn record, acc ->
      new_components =
        case acc[record.entity_id] do
          nil -> record.component
          _ -> Map.merge(acc[record.entity_id], record.component)
        end

      Map.put(acc, record.entity_id, new_components)
    end)
  end

```

These functions retrive the entities for a room from the database formatted as a single map/object.

To make sure these functions work let's right a test.  Let's update the `room_test.exs` with the following:

```elixir
defmodule Xr.RoomsTest do
  use Xr.DataCase

  alias Xr.Rooms

  ...

  describe "entities" do
    alias Xr.Rooms.Room

    import Xr.RoomsFixtures

    test "create_entity/3 with valid data creates a entity" do
      room = room_fixture()

      Rooms.create_entity(room.id, Ecto.UUID.generate(), %{
        "mesh_builder" => "box",
        "position" => [1, 2, 3]
      })

      Rooms.create_entity(room.id, Ecto.UUID.generate(), %{
        "mesh_builder" => "teleportable",
        "position" => [4, 0, -1]
      })

      assert Rooms.entities(room.id) |> Map.keys() |> Enum.count() == 2
    end
  end
end

```

Run the test with `mix test`.  (I haven't been updating tests along the way during every change, if you get some broken tests, just remove them like I did.  They no longer test valid things.  If I have time I'll go back and change this book to modify the tests as we go along TDD style).  This test shows that we can insert entities into the database and we can query the entities back using a query.

### Add Random Obstacles To A Room Upon Creation

Let's create a function that takes a room_id and adds some random sized boxes at random positions:

```elixir
  def generate_random_content(room_id) do
     # run this a few random times to create random entities
    for _ <- 1..Enum.random(5..20) do
      create_entity(room.id, Ecto.UUID.generate(), %{
        "mesh_builder" => ["box", create_random_box_args()],
        "position" => create_random_position(),
      })
    end
  end

  def create_random_position() do
    [Enum.random(-25..25), Enum.random(0..4), Enum.random(-25..25)]
  end

  def create_random_box_args() do
    %{
      "depth" => Enum.random(1..10),
      "height" => Enum.random(1..10),
      "width" => Enum.random(1..10)
    }
  end
```
Then let's wrap it up nicely in a new function in the `rooms.ex` context:

```elixir
  def create_room_with_random_content(attrs \\ %{}) do
    {:ok, room} = create_room(attrs)
    generate_random_content(room.id)
    {:ok, room}
  end
```

Open up `room_controller.ex` and modify and use the new function to look like the following:

```elixir
  def create(conn, %{"room" => room_params}) do
    case Rooms.create_room_with_random_content(room_params) do
      {:ok, room} ->
        conn
        |> put_flash(:info, "Room created successfully.")
        |> redirect(to: ~p"/rooms")

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, :new, changeset: changeset)
    end
  end
```

I also made the redirect go to the `~p"/rooms"` index instead of putting us in the room when the room is created, which is the behavior I prefer.

Reset all your data in your dev database using `mix ecto.reset`.  Run your server again and create a new room and this time some random objects should be created.  We can check in the iex terminal using:

```elixir
> Xr.Rooms.entities("abcde") # get your room_id from your browser's URL bar
%{
  "34hrj" => %{
    "color" => [18, 124, 84],
    "mesh_builder" => ["box", %{"depth" => 5, "height" => 6, "width" => 5}],
    "position" => [-2, 0, 0]
  },
  ...
  ...
```

### Push Entities_State to Client After Join

Now let's pass this data to the front-end via the room channel.  After we join the room let's push the entities map down to the client.  Open up `room_channel.ex` and modify the handler for `after_join`.

```elixir
  def handle_info(:after_join, socket) do
    entities = Xr.Rooms.entities(socket.assigns.room_id)
    push(socket, "entities_state", entities)
    {:noreply, socket}
  end
```

### Process entities_state in the Frontend

Now lets make some system on the front-end to consume this message and draw the boxes.  We'll make a system for each component.  

First we subscribe to the incoming message using `channel.on`.  Since `broker.ts` handles our communications with the channel we can put it there.  Then we loop through and break the large message apart for each entity, and then send process it.

```typescript
  channel.on("entities_state", (payload: { [entity_id: string]: {[component_name: string]: any} }) => {
    for (const [entity_id, components] of Object.entries(payload)) {
      // send this data somewhere
    }
  });
```
We want to keep `broker.ts` limited to code related to channels stuff, so instead of processing the events here, let's push them into an eventbus and some other systems can subscribe to the messages.

We want systems to be able to handle different kinds of entity component operations such as when an entity is "created", "updated", or "deleted".  So our message can look like this:

```typescript
{op: "create", eid: "entity_id", com: {... components }}
```

#### Add EventBus to FrontEnd

Let's add the ability to publish and subscribe to messages between systems.

RxJS is "a library for composing asynchronous and event-based programs by using observable sequences".  This is a fancy way of saying that not only can we do regular pub/sub of events, we can do tricky operations on events.

It's a bit much to explain all the benefits here, here are some links to read up on and play with:

https://rxjs.dev/guide/overview

## Using RXJS for events

The main api we will be using from RxJS is `Subject`.  Think of a Subject as an event bus where you can push messages into it with `next(...data...)` and subscribe to the data using `subscribe(callback)`.

RxJS then provides a bunch of useful ways to pipe, filter, combine, throttle, transform events from multiple streams of data.  I often reference https://rxmarbles.com/ to visualize how the data flows.

Let's install rxjs from our `assets` directory:

```bash
npm i rxjs
```

Let's modify `config.ts` to add some `rxjs.Subject` streams that we can use in systems.  Let's also add a type called StateMutation to describe the shape of our events.

```typescript
import type { Channel, Socket } from "phoenix";
import type { Scene } from "@babylonjs/core/scene";
import { Subject } from "rxjs/internal/Subject";
import type { State } from "./systems/state";

export enum StateOperation {
  create = "c",
  update = "u",
  delete = "d",
}

export type StateMutation = {
    op: StateOperation;
    eid: string;
    com?: {
      [component_name: string]: any;
    };
  }
}
// rxjs filter helper for matching if a component exists in event
export const componentExists = (component_name: string) => {
  return (evt: StateMutation) => {
    return evt.com[component_name] !== undefined
  }
}

export type Config = {
  room_id: string;
  user_id: string;
  scene: Scene;
  socket: Socket;
  channel: Channel;
  state: State;
  $state_mutations: Subject<StateMutation>;
};

```

In `orchestrator.ts` we need to initialize those `RxJS.Subject`s.

```typescript
 const config: Config = {
  room_id: opts.room_id,
  user_id: opts.user_id,
  scene: null,
  socket: opts.socket,
  channel: null,
  state: null,
  $state_mutations: new Subject<StateMutation>(),
}
```

Now back in `broker.ts` we can create an event and send it to `$state_mutations` Subject.

```typescript
import { Config, StateOperation } from "../config";

export const init = (config: Config) => {
  
  // channel connection
  const {socket, $state_mutations} = config;
  socket.connect();
  let channel = socket.channel(`room:${config.room_id}`, {});
  config.channel = channel;

  // channel subscriptions
  channel.on("entities_state", (payload: { [entity_id: string]: {[component_name: string]: any} }) => {
    for (const [entity_id, components] of Object.entries(payload)) {
      $state_mutations.next({op: StateOperation.create, eid: entity_id, com: components});
    }
  });

  ...
```

Now let's create the `mesh_builder.ts` system and the `position.ts` system to react to these messages coming through `$state_mutations`.

Create `assets/js/systems/mesh_builder.ts`:

```typescript
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { StateOperation, componentExists, Config } from "../config";
import { filter  } from "rxjs/operators";

export const init = (config: Config) => {
  
  const { scene, $state_mutations } = config;

  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.create)),
    filter(componentExists("mesh_builder")),
  ).subscribe((evt) => {
    const value = evt.com["mesh_builder"];
    const [mesh_type, mesh_args] = value
    if (mesh_type === "box") {
      const box =
        scene.getMeshByName(evt.eid) ||
        CreateBox(evt.eid, mesh_args, scene);
    } 
  })

}
```
Create `assets/js/systems/position.ts`

```typescript
import { StateOperation, componentExists, Config } from "../config";
import { filter } from "rxjs/operators";

export const init = (config: Config) => {

  const { scene, $state_mutations } = config;

  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.create)),
    filter(componentExists("position")),
  ).subscribe((evt) => {
    const value = evt.com["position"];
    const mesh = scene.getMeshByName(evt.eid);
    if (mesh) {
      mesh.position.fromArray(value);
    }
  })
}

```

Remember to add them to `orchestrator.ts`

```typescript
...

import * as MeshBuilder from "./systems/mesh_builder";
import * as Position from "./systems/position";

...
        
    // initialize systems, order matters
    Scene.init(config)
    Broker.init(config)
    MeshBuilder.init(config)
    Position.init(config)

...

```

If you now visit your browser and create some different rooms you will see some random boxes spread about.  We have successfully created different content for each room and we're seeing the differences in the browser.

The boxes are pretty bland though.  Let's try adding some color.

### Add Color Using Materials

Open up `rooms.ex` and add a color component in our random box generator:

```elixir 
def generate_random_content(room_id) do
  # pick a random color
  color = create_random_color()
  # run this a few random times to create random entities
  for _ <- 1..Enum.random(5..20) do
    create_entity(room_id, Ecto.UUID.generate(), %{
      "mesh_builder" => ["box", create_random_box_args()],
      "position" => create_random_position(),
      "color" => shift_color(color)
    })
  end
end
```

Also define a function that can create a random color:

```elixir
  def create_random_color() do
    for _ <- 1..3 do
      Enum.random(0..100) / 100
    end
  end

  def shift_color(color) do
    # color is a list with 3 elements
    # pick one of the element positions
    position = Enum.random(0..2)
    # modify the value at that position
    offset =
      case Enum.at(color, position) + Enum.random(-500..500) / 1000 do
        offset when offset < 0 -> 0
        offset when offset > 1 -> 1
        offset -> offset
      end

    List.replace_at(color, position, offset)
  end
```

I pick one base random color for a room, then just color shift all the other colors for the boxes.  That way each room tends to have a similar hue rather than having every room look like confetti.

We created a new "color" component for all entities.  Now we need to write a system to respond to it.

Create `assets/js/systems/color.ts`

```typescript
import { StateOperation, componentExists, Config } from "../config";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { filter } from "rxjs/operators";

export const init = (config: Config) => {


  const { scene, $state_mutations } = config;

  $state_mutations.pipe(
    filter(evt => (evt.op === StateOperation.create)),
    filter(componentExists("color")),
  ).subscribe((evt) => {
    const value = evt.com["color"];
    const mesh = scene.getMeshByName(evt.eid);
    if (mesh) {
      let material = new StandardMaterial(value, scene);
      material.alpha = 1;
      material.diffuseColor = new Color3(
        value[0],
        value[1],
        value[2]
      );
      mesh.material = material;
    }

  });

};
```

Don't forget to add the new system to `orchestrator.ts` just as we did previously.

Reset the database to destroy all the previous entity data that had no color:

```bash
mix ecto.reset
```

Give it another test in the browser.  Create some new rooms and visit them.  We now have some colorful random obstacles.

### Summary

In this chapter we created random colored boxes in the scene for each room so that we can disguish the content from one room to another.  We used `mix phx.gen.schema` generator to create a components table to store data about what entity/components are in a room.  We then added functions to the `rooms.ex` context module to add entities and query entities for a room.  We then created a function `create_room_with_random_content` to add random boxes of different random sizes and positions to a room and used that function in the RoomController when a new room is created. We pushed the entities data to the front-end using `push(socket, "entities_state", entities)` in the RoomChannel's `after_join` handler.  We received this data by adding `channel.on("entities_state")` listener in `broker.ts`.  We added RxJS to have nice event handling.  We added a new type `StateMutation` to config and added `$state_mutation: Subject<StateMutation>` stream to `Config`.  We then had `broker.ts` loop through each entity of the "entities_state" event and create a state mutation "create" operation event and publish that to a `$state_mutations` RxJS Stream.  We created three systems, `mesh_builder`, `position` and `color` to handle each new component, where each system listens on `$state_mutations` filtering for the component that interests them and updates the scene accordingly.
