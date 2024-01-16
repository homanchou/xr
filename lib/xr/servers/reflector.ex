defmodule Xr.Servers.Reflector do
  use GenServer
  alias Phoenix.PubSub
  import Xr.Events

  # creates a tuple that will automatically map a string "user_states:#{room_id}" to this new process
  def via_tuple(room_id) do
    {:via, Registry, {Xr.RoomsRegistry, "reflector:#{room_id}"}}
  end

  def start_link(room_id) do
    GenServer.start_link(__MODULE__, {:ok, room_id}, name: via_tuple(room_id))
  end

  @impl true
  def init({:ok, room_id}) do
    # subscribe to the room stream
    PubSub.subscribe(Xr.PubSub, "room_stream:#{room_id}")

    {:ok, %{room_id: room_id}}
  end

  # responds to incoming message from the room stream and reflects it out to the client
  @impl true
  def handle_info(%{"event" => event_name, "payload" => payload}, state) do
    event(state.room_id, event_name, payload)
    |> to_client()

    {:noreply, state}
  end
end
