defmodule XrWeb.RoomController do
  use XrWeb, :controller

  alias Xr.Rooms
  alias Xr.Rooms.Room

  def index(conn, _params) do
    rooms = Rooms.list_rooms()
    render(conn, :index, rooms: rooms)
  end

  def new(conn, _params) do
    changeset = Rooms.change_room(%Room{})
    render(conn, :new, changeset: changeset)
  end

  def create(conn, %{"room" => room_params}) do
    case Rooms.create_room_with_random_content(room_params) do
      {:ok, _room} ->
        conn
        |> put_flash(:info, "Room created successfully.")
        |> redirect(to: ~p"/rooms")

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, :new, changeset: changeset)
    end
  end

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

        initial_snapshot = Rooms.initial_snapshot(room.id)
        render(conn, :show, orchestrator: true, room: room, entities: initial_snapshot.data)
    end
  end

  def edit(conn, %{"id" => id}) do
    room = Rooms.get_room!(id)
    changeset = Rooms.change_room(room)
    render(conn, :edit, room: room, changeset: changeset)
  end

  def update(conn, %{"id" => id, "room" => room_params}) do
    room = Rooms.get_room!(id)

    case Rooms.update_room(room, room_params) do
      {:ok, room} ->
        conn
        |> put_flash(:info, "Room updated successfully.")
        |> redirect(to: ~p"/rooms/")

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, :edit, room: room, changeset: changeset)
    end
  end

  def delete(conn, %{"id" => id}) do
    room = Rooms.get_room!(id)
    {:ok, _room} = Rooms.delete_room(room)

    conn
    |> put_flash(:info, "Room deleted successfully.")
    |> redirect(to: ~p"/rooms")
  end
end
