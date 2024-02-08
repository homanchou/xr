defmodule XrWeb.Presence do
  @moduledoc """
  Provides presence tracking to channels and processes.

  See the [`Phoenix.Presence`](https://hexdocs.pm/phoenix/Phoenix.Presence.html)
  docs for more details.
  """
  use Phoenix.Presence,
    otp_app: :xr,
    pubsub_server: Xr.PubSub

  alias Xr.Rooms

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
      emit_joined(room_id, user_id)
    end

    for {user_id, _} <- leaves do
      emit_left(room_id, user_id)
    end

    {:ok, state}
  end

  def emit_left(room_id, user_id) do
    Xr.Utils.to_room_stream(room_id, "user_left", %{"user_id" => user_id})
  end

  def emit_joined(room_id, user_id) do
    case Rooms.get_entity_state(room_id, user_id) do
      nil ->
        default_rotation = [0, 0, 0, 1]

        default_user_state = %{
          "tag" => "avatar",
          "pose" => %{
            "head" => Rooms.get_head_position_near_spawn_point(room_id) ++ default_rotation
          },
          "user_id" => user_id
        }

        Xr.Utils.to_room_stream(room_id, "user_joined", default_user_state)

      components ->
        # resume previous user state
        Xr.Utils.to_room_stream(room_id, "user_joined", Map.put(components, "user_id", user_id))
    end
  end
end
