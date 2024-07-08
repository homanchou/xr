defmodule Xr.Servers.EventDispatcher do
  use GenServer
  alias Phoenix.PubSub

  def start_link(room_id) do
    GenServer.start_link(__MODULE__, {:ok, room_id})
  end

  def init({:ok, room_id}) do
    # subscribe to the room stream
    PubSub.subscribe(Xr.PubSub, "room_stream:#{room_id}")

    {:ok, %{room_id: room_id, events: [], sequence: 0}}
  end

  # responds to incoming message from the room stream
  def handle_info({event_name, payload}, state) do
    sequence = state.sequence + 1
    state = %{state | sequence: sequence}

    {:noreply,
     Map.put(state, :events, [
       %{sequence: sequence, event_name: event_name, payload: payload} | state.events
     ])}
  end
end
