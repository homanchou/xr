
### Create Snippet Table

Our components table is designed to be able to easily update particular components.  As the game proceeds and the state changes we'll be able to keep the database updated with the latest state of the world.  However when the game is over and we want to reset to the original state we'll need a way to restore all the entities back to their original state.

The Babylon.js community has the concept of a snippet server that allows saving and retreiving of json payloads for things like GUIs, animations, node materials etc.  Inspired by this idea, let's create a snippets table.  This table hold immutable read-only versions of any kinds of payloads we want to store and retrieve.

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
        "mesh_builder" => "floor",
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