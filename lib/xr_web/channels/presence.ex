defmodule XrWeb.Presence do
  @moduledoc """
  Provides presence tracking to channels and processes.

  See the [`Phoenix.Presence`](https://hexdocs.pm/phoenix/Phoenix.Presence.html)
  docs for more details.
  """
  use Phoenix.Presence,
    otp_app: :xr,
    pubsub_server: Xr.PubSub

  alias Xr.Servers.State
  alias Xr.Rooms

  import Xr.Events

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
      case State.entity_state(room_id, user_id) do
        nil ->
          emit_join_at_spawn_point(room_id, user_id)

        user_state ->
          emit_join_from_previous_state(room_id, user_id, user_state)
      end
    end

    for {user_id, _} <- leaves do
      emit_left(room_id, user_id)
    end

    {:ok, state}
  end

  def emit_left(room_id, user_id) do
    event(room_id, "user_left", %{"user_id" => user_id})
    |> to_room_stream()
  end

  def emit_join_at_spawn_point(room_id, user_id) do
    event(room_id, "user_joined", %{
      "user_id" => user_id,
      "position" => Rooms.get_head_position_near_spawn_point(room_id),
      "rotation" => [0, 0, 0, 1]
    })
    |> to_room_stream()
  end

  def emit_join_from_previous_state(room_id, user_id, %{
        create: create,
        update: update
      }) do
    data = update || create
    event(room_id, "user_joined", %{
      "user_id" => user_id,
      "position" => data["position"],
      "rotation" => data["rotation"]
    })
    |> to_room_stream()
  end
end
