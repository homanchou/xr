defmodule Xr.Servers.State.Test do
  use ExUnit.Case, async: true

  alias Phoenix.PubSub
  alias Xr.Servers.EntitiesDiff

  test "add receive user messages" do
    # create the genserver for state
    {:ok, pid} = EntitiesDiff.start_link("test1")
    # send a message on pubsub
    # user joins
    PubSub.broadcast(Xr.PubSub, "room_stream:test1", %{
      "event" => "user_joined",
      "payload" => %{"user_id" => "1", "position" => [0, 0, 0], "rotation" => [0, 0, 0, 1]}
    })

    PubSub.broadcast(Xr.PubSub, "room_stream:test1", %{
      "event" => "user_moved",
      "payload" => %{"user_id" => "1", "position" => [1, 2, 3], "rotation" => [1, 2, 3, 4]}
    })

    :timer.sleep(500)
    # check that the state has been updated
  end
end
