## Persistence of Previous Location after Refresh

When we first join the room our camera is placed at the spawn_point.  If we then move about the space, travel to a new location then refresh the window, we might expect to resume our previous position but instead we're always teleported back to the original spawn_point.

This is because in presence.ex, when we join the room, we always lookup the spawn point and inject that into our user_joined event, which comes back to us in the form of an entities_diff event which then is transformed into a state_mutations event and finally is matched in avatar.ts and sets our camera back to the spawn point location.

To address this issue we should let the server cache our current location continuously, and then when we join the room the next time, use the previous data we have cached on the server if it exists.  If it doesn't then we'll fall back to using the spawn point.  

### Create Get Entity State Function

First we'll add a helper function to `rooms.ex` to lookup an entity's state:

```elixir

  def get_entity_state(room_id, entity_id) do
    components_for_entity_id(room_id, entity_id)
    |> components_to_map()
    |> Map.values()
    |> List.first()
  end

  def components_for_entity_id(room_id, entity_id) do
    Repo.all(
      from e in Xr.Rooms.Component,
        where: e.room_id == ^room_id and e.entity_id == ^entity_id
    )
  end
```

Then we can use this `get_entity_state` function back in `presence.ex`:

```elixir
def emit_joined(room_id, user_id) do
  case Rooms.get_entity_state(room_id, user_id) do
    nil ->
      default_rotation = [0, 0, 0, 1]

      default_user_state = %{
        "color" => Xr.Rooms.create_random_color(),
        "tag" => "avatar",
        "pose" => %{
          "head" => Rooms.get_head_position_near_spawn_point(room_id) ++ default_rotation
        },
        "user_id" => user_id
      }

      Xr.Utils.to_room_stream(room_id, "user_joined", default_user_state)

    components ->
      # resume previous user state
      Xr.Utils.to_room_stream(room_id, "user_joined", Map.put(components, "user_id", user_id))
  end
end
```

First we check if we have some previous component data for the entity.  If we don't then we'll use the spawn_point data.  If we do have previous component data then we'll use that in the room_event and when the frontend picks it up we'll pick up the same position we last left off at.

There's just one problem with this.  When we close our browser, that will generate a "user_left" event which will generate an "entities_diff" event which is listened to by our EntitiesState GenServer which then deletes the entity from the database.

To solve this problem we can introduce a soft delete into the components table.  That way no record is truely deleted.  Instead we'll just set a timestamp on delete_at column.  When we query the entities in the room we'll query only the entities and components that have deleted_at null.  But when we use `Rooms.get_entity_state` we will ignore the soft_delete and be able to recover the user's previous component data.

### At deleted_at

We can create a new migration (I'm just updating the same one since I'm lazy and I'll destroy my local db anyway).  If you've already deployed somewhere or using CI/CD you must create a new migration.

```elixir
    ...
    add :deleted_at, :utc_datetime, null: true, default: nil
    ...
```

### Modify Helper Functions

Update the functions in `rooms.ex` to be deleted_at aware.

```elixir
  def components(room_id) do
    Repo.all(
      from e in Xr.Rooms.Component,
        where: e.room_id == ^room_id and is_nil(e.deleted_at),
        order_by: e.entity_id
    )
  end
```

Add a soft delete function too.

```elixir
  def soft_delete_entity(room_id, entity_id) do
    from(c in Xr.Rooms.Component,
      where: c.room_id == ^room_id and c.entity_id == ^entity_id
    )
    |> Repo.update_all(set: [deleted_at: DateTime.utc_now()])
  end
```

We've introduced another problem now, and that's that we have a unique constraint on entity_id and component_name.  But what happens is that if we only soft_delete users, when the user rejoins the room, the "entities_diff" operation will cause us to create the entity with the same id.  We can fix this by doing an upsert operation.  

```elixir
  def create_entity(room_id, entity_id, components = %{}) do
    # loop through components
    for {component_name, component_value} <- components do
      %Xr.Rooms.Component{
        room_id: room_id,
        entity_id: entity_id,
        component_name: component_name,
        component: %{component_name => component_value}
      }
      |> Xr.Repo.insert!(
        on_conflict: [set: [component: %{component_name => component_value}, deleted_at: nil]],
        conflict_target: [:entity_id, :component_name]
      )
    end
  end
```
The on_conflict option will set the component new value and remove any deleted_at timestamp if there was an insert conflict.  Likewise if we're updating any component then we should remove any deleted_at timestamp as well.

```elixir
  def update_component(room_id, entity_id, component_name, component_value) do
    case Repo.get_by(Xr.Rooms.Component,
           room_id: room_id,
           entity_id: entity_id,
           component_name: component_name
         ) do
      nil ->
        :noop

      component ->
        component
        |> Xr.Rooms.Component.changeset(%{
          component: %{component_name => component_value},
          deleted_at: nil
        })
        |> Repo.update()
    end
  end
```


### Write Some Tests

Add another test to `rooms_test.exs` to make sure soft_delete and upsert works as expected:

```elixir

    test "recreate soft deleted entity is ok" do
      room = room_fixture()
      user_id = Xr.Utils.random_string()
      Rooms.create_entity(room.id, user_id, %{"pose" => %{"head" => [0, 0, 0, 1, 2, 3, 4]}})
      assert Rooms.entities(room.id) |> Map.keys() |> Enum.count() == 1
      Rooms.soft_delete_entity(room.id, user_id)
      assert Rooms.entities(room.id) |> Map.keys() |> Enum.count() == 0
      Rooms.create_entity(room.id, user_id, %{"pose" => %{"head" => [0, 0, 0, 1, 2, 3, 4]}})
      assert Rooms.entities(room.id) |> Map.keys() |> Enum.count() == 1
    end
```


Finally let's use the soft_delete function when we are processing the "entities_diff" event:

```elixir
  def update_entities(room_id, %{creates: creates, updates: updates, deletes: deletes}) do
    for {entity_id, components} <- creates do
      create_entity(room_id, entity_id, components)
    end

    for {entity_id, components} <- updates do
      for {component_name, component_value} <- components do
        update_component(room_id, entity_id, component_name, component_value)
      end
    end

    # soft delete
    for {entity_id, components} <- deletes do
      for {component_name, component_value} <- components do
        update_component(room_id, entity_id, component_name, component_value)
      end

      soft_delete_entity(room_id, entity_id)
    end
  end
```

We now have the ability to retain the previous camera position and rotation after a browser refresh.  

### When to persist and when to reset

During the course of one game, or even setting aside browser games for a moment, when I encounter issues on a webpage, my goto action to try to fix the state is trying a reload of the page.  Sometimes this fixes it, sometimes not, depending on the issue.  My intuition is that when there are subtle errors or issues with our xr-experience, such as an audio issue, or some other glitch, users will try a full page refresh in an attempt to fix the issue.  When that happens, we generally just want to pick-up right where they left off.  The server-side state persistance helps preserve any and all changes that have occured since the game was started.

However, when the game is played to completion, and we want to restart the game either for ourselves or for the next round of players, then we need a way to fully reset the state of the world back to the original settings.

The components table in our postgres database serves as a live in-progress game memory.  It is constantly updated by every entities_diff message in realtime as the game goes on.  But after the game is over, we want to be able to reset the components table back to the beginning.  We'll need another table to hold an initial snapshot to restore the components table from.

The Babylon.js community has the concept of a snippet server that allows saving and retreiving of json payloads for things like GUIs, animations, node materials etc.  Inspired by this idea, let's create a snippets table.  This table hold immutable read-only versions of any kinds of payloads we want to store and retrieve.  By taking a snapshot of the original state of the components table and saving that as JSON data into a snippets table, we can then "reset" the room state by deleting all the data in a room then rehydrating the components table using the saved snippet.

### Create Snippets Table

Run this generator:

```bash
mix phx.gen.schema Rooms.Snippet snippets room_id:references:rooms type:string slug:string data:map
```

Modify the migration file to look like this.

```elixir
defmodule Xr.Repo.Migrations.CreateSnippets do
  use Ecto.Migration

  def change do
    create table(:snippets, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :type, :string, null: false
      add :slug, :string, null: false
      add :data, :map, null: false, default: %{}
      add :room_id, references(:rooms, on_delete: :delete_all, type: :string)

      timestamps(type: :utc_datetime)
    end

    create index(:snippets, [:room_id])
  end
end
```

When the room is first created we are randomly generating some entities and saving them in the database.  Let's make a copy of that original state into the snippet server.  We can then restore the entities from the snippet back into the database at some point in the future.  


Here's a test to cover the functions we will write:

```elixir


    test "create snippet" do
      room = room_fixture()
      snippet = Rooms.create_snippet(room.id, "some kind", "some slug", %{"some" => "data"})
      assert snippet.room_id == room.id
    end

    # save room entities to snapshot snippet

    test "save entities to snapshot then load entities from snapshot" do
      room = room_fixture()

      Rooms.create_entity(room.id, Xr.Utils.random_string(5), %{
        "mesh_builder" => "box",
        "position" => [1, 2, 3]
      })

      Rooms.create_entity(room.id, Xr.Utils.random_string(5), %{
        "mesh_builder" => "teleportable",
        "position" => [4, 0, -1]
      })

      Rooms.save_entities_to_initial_snapshot(room.id)
      assert Rooms.snippets(room.id) |> Enum.count() == 1

      Rooms.delete_entities(room.id)
      assert Rooms.entities(room.id) == %{}

      Rooms.replace_entities_with_initial_snapshot(room.id)
      assert Rooms.entities(room.id) |> Map.keys() |> Enum.count() == 2
    end

```

And here's the new functions:

```elixir

  def create_snippet(room_id, kind, slug, data) do
    %Xr.Rooms.Snippet{
      room_id: room_id
    }
    |> Xr.Rooms.Snippet.changeset(%{type: kind, slug: slug, data: data})
    |> Repo.insert!()
  end

  def snippets(room_id) do
    Repo.all(from s in Xr.Rooms.Snippet, where: s.room_id == ^room_id)
  end

  def snippets_by_slug_and_kind(room_id, kind, slug) do
    Repo.all(
      from s in Xr.Rooms.Snippet,
        where: s.room_id == ^room_id and s.type == ^kind and s.slug == ^slug
    )
  end

  def save_entities_to_initial_snapshot(room_id) do
    data = entities(room_id)
    create_snippet(room_id, "snapshot", "initial_snapshot", data)
  end

  def initial_snapshot(room_id) do
    case snippets_by_slug_and_kind(room_id, "snapshot", "initial_snapshot") do
      [snapshot] -> snapshot
      _ -> nil
    end
  end

  def replace_entities_with_initial_snapshot(room_id) do
    # find the initial snapshot
    case initial_snapshot(room_id) do
      nil ->
        :noop

      # clear old data
      snapshot ->
        delete_entities(room_id)
        # iterate through the map of components and build entities
        for {entity_id, components} <- snapshot.data do
          create_entity(room_id, entity_id, components)
        end
    end
  end

```
And here's how we use it.

### Create an initial snippet when creating the room.

When we create the room, let's make a snippet.  In `rooms.exs` modify:

```elixir
  def create_room_with_random_content(attrs \\ %{}) do
    {:ok, room} = create_room(attrs)
    generate_random_content(room.id)
    save_entities_to_initial_snapshot(room.id)

    {:ok, room}
  end
```
This makes a kind of backup of whats in the entities table, (many rows of component data) into a single row of json in the snippets table.

Then we restore the components table with the snippets data when the rooms genserver is initially started.  Edit the `show` function in `rooms_controller.ex`

```elixir
def show(conn, %{"id" => id}) do
    case Rooms.get_room(id) do
      nil ->
        conn
        |> put_flash(:error, "No such room \"#{id}\"")
        |> redirect(to: ~p"/rooms")

      room ->
        case Xr.Servers.RoomsSupervisor.start_room(room.id) do
          {:ok, _pid} -> Rooms.replace_entities_with_initial_snapshot(room.id)
          _ -> :noop
        end

        render(conn, :show, orchestrator: true, room: room)
    end
```

The `Xr.Servers.RoomsSupervisor.start_room(room.id)` is an idempotent function.  Meaning that it can run multiple times.  If the room hasn't been started yet, it will return `{:ok, pid}`.  But if the room was already started then it will return something else.  It doesn't matter what it is.  The point is, if and only if the was some tuple starting with :ok, then we interpret that to mean that we're starting the room over.  Whenever we start a new room server we can trust that we're getting a fresh state.  

### Summary

In this chapter we added the ability to retain a user's previous position and rotation after a full page refresh.  We add this ability to query the user's entity value from the postgres database (even though the user left the room), by introducing soft_delete.  We added a deleted_at column to the components table.  We modified helper functions to support new queries and update functions.  We also introduced the concept of a snapshot snippet table so we can export the contents of the components table into the snippet table and also be able to go the other direction to restore components table from a snippet.  We added the feature to create a snapshot of the random box initial content when a new room is created and override the components table with this snapshot when the genserver is started.