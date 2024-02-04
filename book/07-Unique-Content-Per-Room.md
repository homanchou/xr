

## Simple Obstacles

At this point we're able to draw something 3D on the screen.  We should have in mind a general concept of the experience we want to craft and generally work toward that direction.  

Here's an outline:

- Every room URL can host a different visual experience.  
- The experience has a starting point and ends when you reach an ending point.  
- There are walls and obstacles.

Sounds pretty familiar right?  Like a maze or maybe a simple escape room.  Let's get started with some obstacles in the room.

### Database Supplied Obstacles

The objects we are currently seeing in the 3D scene were hardcoded in `scene.ts`.  But we'd like the ability to customize each room with some different meshes so that each room looks unique.  Babylon.js has prebuilt functions for many primative objects such as sphere, box, plane, column, etc.  Additionally these objects can be scaled, positioned and rotated in the scene.  

### Design a Snapshot Payload

If we send an "entties_state" messsage with all items in our seen, it might look something like this:

```json
{
  "entity1": {"position": [...], "rotation": [...], "scaling": [...], "mesh_builder": ...},
  "entity2": {"position": [...], "rotation": [...], "scaling": [...], "mesh_builder": ...},
}
```

In the payload above, each key/value pair represents a "thing" and "it's data".  Each key is an entity_id (randomly generated id, and each value is a JSON object of components (data for the thing).  A component is just another key/value pair.  For example "position" is a component name with [1,2,3] as the component value.  Components are just data, and entities are just ids.  To make sense of the data we use Systems.  We already have a folder we have created for systems.  Each system listens for incoming messages and will react accordingly to change the scene.

There are lots of ways we could design the schema for a database to persist this data.  I'm opting for a simple single table for each component in a row.  That way if only one component is updated for an entity then only one row needs to change.  In the above example, "entity1" has 4 components so it would occupy 4 rows in the database.  Each of the 4 rows would share the same entity_id, as well as a room_id because entities are tied to a particular room.

### Create the Components Table

Let's create a database table to be able to store some meta data about simple background objects.  We can then query this table for any objects that are supposed to be in the room and then load them and create them in 3D instead of hardcoding them.  Execute this Phoenix generator command:

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

    create index(:components, [:room_id, :entity_id])
    # helps look up tags
    create index(:components, [:room_id, :component_name])
    create index(:components, [:entity_id, :component_name], unique: true)
  end
end

```

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
    %Xr.Rooms.Entity{
      room_id: room_id,
      entity_id: entity_id,
      component_name: component_name,
      component: %{component_name => component_value}
    }
    |> Xr.Repo.insert!()
  end
end
```

We'll also create some functions to retrieve the entities back from the database:

```elixir
 @doc """
  Get all components for a room, sorted by entity_id so all components for entities are next to each other
  """

  def components(room_id) do
    Repo.all(from e in Xr.Rooms.Entity, where: e.room_id == ^room_id, order_by: e.entity_id)
  end

  @doc """
  Get a map of entities and their components for a room
  """

  def entities(room_id) do
    components(room_id)
    |> components_to_map()
  end

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

To makes sure these functions work let's right a test.  Let's update the `room_test.exs` with the following:

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
        "mesh_builder" => "floor",
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

Open up `room_controller.ex` and modify the `create` room function to look like the following:

```elixir
  def create(conn, %{"room" => room_params}) do
    case Rooms.create_room(room_params) do
      {:ok, room} ->
        Xr.Rooms.generate_random_content(room.id)

        conn
        |> put_flash(:info, "Room created successfully.")
        |> redirect(to: ~p"/rooms")

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, :new, changeset: changeset)
    end
  end
```

I added the call to `generate_random_content` as well as made the redirect go to the index instead of putting us in the room when the room is created, which is the behavior I prefer.


Reset all your data in your dev database using `mix ecto.reset`.  Run your server again and create a new room and this time some random objects should be created.  We can check in the iex terminal using:

```elixir
> Xr.Rooms.entities("453b6858-9403-4dd9-a58e-17d25737be84") # get your room_id from your browser's URL bar
%{
  "027c850f-13aa-440f-9865-5a65fea6ec70" => %{
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

### Add Snapshot System in the Frontend

Now lets make a new system on the front-end to consume this message and draw the boxes.  Create a file at `assets/js/systems/snapshot.ts`:

```typescript
import { CreateBox } from "@babylonjs/core/Meshes/Builders";
import { config } from "../config";

const { scene, channel } = config;

channel.on("entities_state", (payload) => {
  // payload is an object of entities, let's go through every one of them
  Object.entries(payload).forEach(([key, value]) => {
    process_entity(key, value as any);
  });
});

const process_entity = (entity_id: string, components: object) => {
  // only react if the mesh_builder component is present in components
  if (components["mesh_builder"]) {
    const [mesh_type, mesh_args] = components["mesh_builder"];
    // currently only handling box type at the moment
    if (mesh_type === "box") {
      const box = CreateBox(entity_id, mesh_args, scene);
      if (components["position"]) {
        box.position.fromArray(components["position"]);
      }
    }
  }
};
```

We're basically just passing the arguments that the Babylon.js Meshbuilder CreateBox already takes and invoking it on the frontend.  

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
    Enum.random(0..255)
  end
end

def shift_color(color) do
  # color is a list with 3 elements
  # pick one of the element positions
  position = Enum.random(0..2)
  # modify the value at that position
  offset = case Enum.at(color, position) + Enum.random(-50..50) do
    offset when offset < 0 -> 0
    offset when offset > 255 -> 255
    offset -> offset
  end

  List.replace_at(color, position, offset)
end
```

I pick one base random color for a room, then just color shift all the other colors for the boxes.  That way each room tends to have a similar hue rather than having every room look like confetti.

We'll listen to that component inside `snapshot.ts` and add a material for that color.

```typescript
const process_entity = (entity_id: string, components: object) => {
  // only react if the mesh_builder component is present in components
  if (components["mesh_builder"]) {
    const [mesh_type, mesh_args] = components["mesh_builder"];
    // currently only handling box type at the moment
    if (mesh_type === "box") {
      const box = CreateBox(entity_id, mesh_args, scene);
      if (components["position"]) {
        box.position.fromArray(components["position"]);
      }
      if (components["color"]) {
        let material = new StandardMaterial(components["color"], scene);
        material.alpha = 1;
        material.diffuseColor = new Color3(components["color"][0]/255, components["color"][1]/255, components["color"][2]/255); 
        box.material = material;
      }
    }
  }
};
```

Give it another test in the browser.  We now have some colorful random obstacles.