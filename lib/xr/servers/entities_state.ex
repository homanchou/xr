defmodule Xr.Servers.EntitiesState do
  @moduledoc """
  Listens to entities diff msg and updates the database.
  """
  use GenServer

  alias Phoenix.PubSub

  def via_tuple(room_id) do
    {:via, Registry, {Xr.RoomsRegistry, "entities_state:#{room_id}"}}
  end

  def start_link(room_id) do
    GenServer.start_link(__MODULE__, {:ok, room_id}, name: via_tuple(room_id))
  end

  @impl true
  def init({:ok, room_id}) do
    # subscribe to the room stream
    PubSub.subscribe(Xr.PubSub, "entities_diff_stream:#{room_id}")

    {:ok, %{room_id: room_id}}
  end

  @impl true
  def handle_info(msg, state) do
    # save changes to db
    Xr.Rooms.update_entities(state.room_id, msg)
    {:noreply, state}
  end
end
