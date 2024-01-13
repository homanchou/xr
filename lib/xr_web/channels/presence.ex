defmodule XrWeb.Presence do
  @moduledoc """
  Provides presence tracking to channels and processes.

  See the [`Phoenix.Presence`](https://hexdocs.pm/phoenix/Phoenix.Presence.html)
  docs for more details.
  """
  use Phoenix.Presence,
    otp_app: :xr,
    pubsub_server: Xr.PubSub

  @doc """
  Presence is great for external clients, such as JavaScript applications,
  but it can also be used from an Elixir client process to keep track of presence changes
  as they happen on the server. This can be accomplished by implementing the optional init/1
   and handle_metas/4 callbacks on your presence module.
  """
  def init(_opts) do
    # user-land state
    {:ok, %{"me" => Enum.random(-5000..5000)}}
  end

  def handle_metas("room:" <> room_id, %{joins: joins, leaves: leaves}, _presences, state) do
    for {user_id, _} <- joins do
      IO.inspect(user_id, label: "joined")
      IO.inspect(state, label: "state")

      XrWeb.Endpoint.broadcast!("room:#{room_id}", "user_joined", %{
        user_id: user_id,
        position: nil,
        rotation: nil
      })
    end

    for {user_id, _} <- leaves do
      XrWeb.Endpoint.broadcast!("room:#{room_id}", "user_left", %{user_id: user_id})
    end

    {:ok, state}
  end
end
