defmodule Xr.Servers.EventDispatcherTest do
  use ExUnit.Case
  use Xr.DataCase

  alias Xr.Servers.EventDispatcher
  alias Phoenix.PubSub

  import Xr.RoomsFixtures

  test "receives and stores events in its state" do
    room = room_fixture()
    room_id = room.id

    # Start the EventDispatcher GenServer
    {:ok, pid} = EventDispatcher.start_link(room_id)

    # Broadcast an event
    Phoenix.PubSub.broadcast(
      Xr.PubSub,
      "room_stream:#{room_id}",
      {"user_moved", %{"user_id" => "tom2", "position" => [1, 2, 3]}}
    )

    # Broadcast another event
    Phoenix.PubSub.broadcast(
      Xr.PubSub,
      "room_stream:#{room_id}",
      {"user_moved", %{"user_id" => "bob", "position" => [11, 12, 13]}}
    )

    # Allow some time for the message to be processed
    :timer.sleep(10)

    # Fetch the state of the GenServer
    state = :sys.get_state(pid)

    assert state.room_id == room_id
    assert state.next_sequence == 3
    assert length(state.events) == 2

    event = hd(state.events)
    assert event.sequence == 2
    assert event.event_name == "user_moved"
    assert event.payload == %{"user_id" => "bob", "position" => [11, 12, 13]}

    # Wait some more time and the events should be flushed

    :timer.sleep(200)

    state = :sys.get_state(pid)
    assert state.events == []

    # and check the database events table for the events
    events = Xr.Rooms.list_room_events(room_id)

    assert length(events) == 2
  end
end
