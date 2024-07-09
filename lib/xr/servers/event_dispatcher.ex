defmodule Xr.Servers.EventDispatcher do
  use GenServer
  alias Phoenix.PubSub

  # 100ms or 10 times per second
  @flush_interval 100

  def via_tuple(room_id) do
    {:via, Registry, {Xr.RoomsRegistry, "event_dispatcher:#{room_id}"}}
  end

  def start_link(room_id) do
    GenServer.start_link(__MODULE__, {:ok, room_id}, name: via_tuple(room_id))
  end

  def init({:ok, room_id}) do
    # subscribe to the room stream
    PubSub.subscribe(Xr.PubSub, "room_stream:#{room_id}")

    # create interval timer

    :timer.send_interval(@flush_interval, self(), :flush)

    # get max sequence from events table
    last_sequence = Xr.Rooms.max_sequence(room_id) || 0

    {:ok, %{room_id: room_id, events: [], next_sequence: last_sequence + 1}}
  end

  # responds to incoming message from the room stream
  def handle_info({event_name, payload}, state) do
    state = %{
      state
      | next_sequence: state.next_sequence + 1,
        events: [
          %{
            sequence: state.next_sequence,
            event_name: event_name,
            payload: payload,
            inserted_at: DateTime.utc_now(),
            updated_at: DateTime.utc_now()
          }
          | state.events
        ]
    }

    {:noreply, state}
  end

  def handle_info(:flush, state) do
    Xr.Rooms.insert_events(state.room_id, state.events)

    {:noreply, %{state | events: []}}
  end
end
