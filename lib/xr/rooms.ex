defmodule Xr.Rooms do
  @moduledoc """
  The Rooms context.
  """

  import Ecto.Query, warn: false
  alias Xr.Repo

  alias Xr.Rooms.Room

  @doc """
  Returns the list of rooms.

  ## Examples

      iex> list_rooms()
      [%Room{}, ...]

  """
  def list_rooms do
    Repo.all(Room)
  end

  @doc """
  Gets a single room.

  Raises `Ecto.NoResultsError` if the Room does not exist.

  ## Examples

      iex> get_room!(123)
      %Room{}

      iex> get_room!(456)
      ** (Ecto.NoResultsError)

  """
  def get_room!(id), do: Repo.get!(Room, id)

  def get_room(id), do: Repo.get(Room, id)

  @doc """
  Creates a room.

  ## Examples

      iex> create_room(%{field: value})
      {:ok, %Room{}}

      iex> create_room(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_room(attrs \\ %{}) do
    %Room{id: Xr.Utils.random_string()}
    |> Room.changeset(attrs)
    |> Repo.insert()
  end

  def create_room_with_random_content(attrs \\ %{}) do
    {:ok, room} = create_room(attrs)
    generate_random_content(room.id)
    save_entities_to_initial_snapshot(room.id)

    {:ok, room}
  end

  def create_floor(room_id) do
    create_entity(room_id, Xr.Utils.random_string(), %{
      "mesh_builder" => ["ground", %{"width" => 100, "height" => 100, "subdivisions" => 2}],
      "position" => [0, 0, 0],
      "material" => "grid",
      "teleportable" => true
    })
  end

  def create_holdables(room_id) do
    [x, y, z] = [0, 1, 0]
    # create a tower of 10 boxes
    for i <- 1..10 do
      create_entity(room_id, Xr.Utils.random_string(), %{
        "mesh_builder" => ["box", %{"size" => 0.5}],
        "position" => [x + i - 5, y, z + i - 5],
        "holdable" => true
      })
    end
  end

  def generate_random_content(room_id) do
    # create a ground
    create_floor(room_id)
    # pick a random color
    color = create_random_color()
    # run this a few random times to create random entities
    for _ <- 1..Enum.random(5..20) do
      create_entity(room_id, Xr.Utils.random_string(), %{
        "mesh_builder" => ["box", create_random_box_args()],
        "position" => create_random_position(),
        "color" => shift_color(color),
        "teleportable" => true
      })
    end

    # create spawn_point
    create_entity(room_id, Xr.Utils.random_string(), %{
      "tag" => "spawn_point",
      "position" => [Enum.random(-10..10), 0.1, Enum.random(-10..10)]
    })

    # create holdables
    create_holdables(room_id)
  end

  # create random positions that do not overlap on the same integer coordinates
  def create_random_position() do
    offset = Enum.random(-1000..1000) / 1000
    [Enum.random(-25..25) + offset, Enum.random(-2..2) + offset, Enum.random(-25..25) + offset]
  end

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
      case Enum.at(color, position) + Float.round(Enum.random(-500..500) / 1000, 3) do
        offset when offset < 0 -> 0
        offset when offset > 1 -> 1
        offset -> offset
      end

    List.replace_at(color, position, offset)
  end

  def create_random_box_args() do
    %{
      "depth" => Enum.random(1..10),
      "height" => Enum.random(1..10),
      "width" => Enum.random(1..10)
    }
  end

  @doc """
  Updates a room.

  ## Examples

      iex> update_room(room, %{field: new_value})
      {:ok, %Room{}}

      iex> update_room(room, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_room(%Room{} = room, attrs) do
    room
    |> Room.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a room.

  ## Examples

      iex> delete_room(room)
      {:ok, %Room{}}

      iex> delete_room(room)
      {:error, %Ecto.Changeset{}}

  """
  def delete_room(%Room{} = room) do
    Repo.delete(room)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking room changes.

  ## Examples

      iex> change_room(room)
      %Ecto.Changeset{data: %Room{}}

  """
  def change_room(%Room{} = room, attrs \\ %{}) do
    Room.changeset(room, attrs)
  end

  def get_entity_state(room_id, entity_id) do
    components_for_entity_id(room_id, entity_id)
    |> components_to_map()
    |> Map.values()
    |> List.first()
  end

  @doc """
  Get all components for a room, sorted by entity_id so all components for entities are next to each other,
  where not soft deleted
  """
  def components(room_id) do
    Repo.all(
      from e in Xr.Rooms.Component,
        where: e.room_id == ^room_id and is_nil(e.deleted_at),
        order_by: e.entity_id
    )
  end

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

  @doc """
  Get all components for an entity that are not soft deleted
  """
  def components_for_entity_id(room_id, entity_id) do
    Repo.all(
      from e in Xr.Rooms.Component,
        where: e.room_id == ^room_id and e.entity_id == ^entity_id
    )
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
      |> Xr.Repo.insert!(
        on_conflict: [set: [component: %{component_name => component_value}, deleted_at: nil]],
        conflict_target: [:entity_id, :component_name]
      )
    end
  end

  def delete_entity_component(room_id, entity_id, component_name) do
    from(c in Xr.Rooms.Component,
      where:
        c.room_id == ^room_id and c.entity_id == ^entity_id and
          c.component_name == ^component_name
    )
    |> Repo.delete_all()
  end

  def delete_entity(room_id, entity_id) do
    from(c in Xr.Rooms.Component,
      where: c.room_id == ^room_id and c.entity_id == ^entity_id
    )
    |> Repo.delete_all()
  end

  def delete_entities(room_id) do
    from(c in Xr.Rooms.Component,
      where: c.room_id == ^room_id
    )
    |> Repo.delete_all()
  end

  def soft_delete_entity(room_id, entity_id) do
    from(c in Xr.Rooms.Component,
      where: c.room_id == ^room_id and c.entity_id == ^entity_id
    )
    |> Repo.update_all(set: [deleted_at: DateTime.utc_now()])
  end

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

  @doc """
  Update entities in a room by applying entities_diff event to the database
  """
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

  ### snippets

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
end
