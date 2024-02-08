defmodule XrWeb.RoomChannel do
  use XrWeb, :channel
  alias XrWeb.Presence

  @impl true
  def join("room:" <> room_id, _payload, socket) do
    if socket.assigns.user_id do
      # make sure room record exists (could have been deleted in the meanwhile)
      case Xr.Rooms.get_room(room_id) do
        nil ->
          {:error, %{reason: "room_not_found"}}

        _ ->
          Xr.Servers.RoomsSupervisor.start_room(room_id)
          send(self(), :after_join)
          {:ok, assign(socket, :room_id, room_id)}
      end
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
  def handle_in("i_moved", payload, socket) do
    Xr.Utils.to_room_stream(
      socket.assigns.room_id,
      "user_moved",
      Map.put(payload, "user_id", socket.assigns.user_id)
    )

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
end
