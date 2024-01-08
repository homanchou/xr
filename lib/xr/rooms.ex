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

  @doc """
  Creates a room.

  ## Examples

      iex> create_room(%{field: value})
      {:ok, %Room{}}

      iex> create_room(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_room(attrs \\ %{}) do
    {:ok, room} =
      %Room{}
      |> Room.changeset(attrs)
      |> Repo.insert()

    # pick a random color
    color = create_random_color()
    # run this a few random times to create random entities
    for _ <- 1..Enum.random(5..20) do
      create_entity(room.id, Ecto.UUID.generate(), %{
        "mesh_builder" => ["box", create_random_box_args()],
        "position" => create_random_position(),
        "color" => shift_color(color)
      })
    end

    # create spawn_point
    create_entity(room.id, Ecto.UUID.generate(), %{"spawn_point" => true, "position" => create_random_position()})

    # need to return {:ok, room} at the end because controller is expecting it
    {:ok, room}
  end

  def create_random_position() do
    [Enum.random(-25..25), Enum.random(-2..2), Enum.random(-25..25)]
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

  def create_random_color() do
    for _ <- 1..3 do
      Enum.random(0..255)
    end
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
      %Xr.Rooms.Entity{
        room_id: room_id,
        entity_id: entity_id,
        component_name: component_name,
        component: %{component_name => component_value}
      }
      |> Xr.Repo.insert!()
    end
  end
end
