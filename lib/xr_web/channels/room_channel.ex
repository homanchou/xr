defmodule XrWeb.RoomChannel do
  use XrWeb, :channel
  alias XrWeb.Presence
  alias Xr.Servers.State
  import Xr.Events

  @impl true
  def join("room:" <> room_id, _payload, socket) do
    if socket.assigns.user_id do
      send(self(), :after_join)
      {:ok, assign(socket, :room_id, room_id)}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  # Channels can be used in a request/response fashion
  # by sending replies to requests from the client
  @impl true
  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  @impl true
  def handle_in("i_moved", %{"position" => position, "rotation" => rotation}, socket) do
    event(socket.assigns.room_id, "user_moved", %{
      "user_id" => socket.assigns.user_id,
      "position" => position,
      "rotation" => rotation
    })
    |> to_room_stream()

    {:noreply, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    {:ok, _} = Presence.track(socket, socket.assigns.user_id, %{})

    entities = Xr.Rooms.entities(socket.assigns.room_id)
    push(socket, "entities_state", entities)
    # push(socket, "user_snapshot", user_snapshot(socket))
    {:noreply, socket}
  end

  def user_snapshot(socket) do
    user_states = State.state(socket.assigns.room_id)

    Presence.list(socket)
    |> Enum.reduce(%{}, fn {user_id, _}, acc ->
      Map.put(acc, user_id, user_states[user_id])
    end)
  end
end
