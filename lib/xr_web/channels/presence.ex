defmodule XrWeb.Presence do
  @moduledoc """
  Provides presence tracking to channels and processes.

  See the [`Phoenix.Presence`](https://hexdocs.pm/phoenix/Phoenix.Presence.html)
  docs for more details.
  """
  use Phoenix.Presence,
    otp_app: :xr,
    pubsub_server: Xr.PubSub

  alias Phoenix.PubSub
  alias Xr.Servers.UserSnapshot

  @doc """
  Presence is great for external clients, such as JavaScript applications,
  but it can also be used from an Elixir client process to keep track of presence changes
  as they happen on the server. This can be accomplished by implementing the optional init/1
   and handle_metas/4 callbacks on your presence module.
  """
  def init(_opts) do
    # user-land state
    {:ok, %{}}
  end

  def handle_metas("room:" <> room_id, %{joins: joins, leaves: leaves}, _presences, state) do
    for {user_id, _} <- joins do
      # if we have previous user state data, then broadcast it
      case UserSnapshot.get_user_state(room_id, user_id) do
        nil ->
          emit_join_at_spawn_point(room_id, user_id)

        %{"position" => position, "rotation" => rotation} ->
          emit_join_from_previous_state(room_id, user_id, position, rotation)
      end
    end

    for {user_id, _} <- leaves do
      PubSub.broadcast(Xr.PubSub, "room_stream:#{room_id}", %{
        "event" => "user_left",
        "payload" => %{"user_id" => user_id}
      })
    end

    {:ok, state}
  end

  def emit_join_at_spawn_point(room_id, user_id) do
    # grab the spawn_point for the room, and broadcast that instead
    entities_map = Xr.Rooms.find_entities_having_component_name(room_id, "spawn_point")

    # graps position from first spawn_point's position component
    {_, %{"position" => position_value}} =
      entities_map |> Enum.find(fn {k, v} -> %{"position" => position} = v end)

    PubSub.broadcast(Xr.PubSub, "room_stream:#{room_id}", %{
      "event" => "user_joined",
      "payload" => %{
        "user_id" => user_id,
        "position" => position_value,
        "rotation" => [0, 0, 0, 1]
      }
    })
  end

  def emit_join_from_previous_state(room_id, user_id, position, rotation) do
    PubSub.broadcast(Xr.PubSub, "room_stream:#{room_id}", %{
      "event" => "user_joined",
      "payload" => %{
        "user_id" => user_id,
        "position" => position,
        "rotation" => rotation
      }
    })
  end
end
