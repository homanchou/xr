defmodule Xr.Events do
  defstruct [:room_id, :event_name, :payload]

  alias Phoenix.PubSub

  # simple way to create a struct without having to write a map and allow chainable broadcasts
  def event(room_id, event_name, payload) when is_map(payload) do
    %__MODULE__{room_id: room_id, event_name: event_name, payload: payload}
  end

  # broadcasts an event to the room stream
  def to_room_stream(%__MODULE__{} = event) do
    PubSub.broadcast(Xr.PubSub, "room_stream:#{event.room_id}", %{
      "event" => event.event_name,
      "payload" => event.payload
    })

    event
  end

  # broadcasts an event to the front-end client
  def to_client(%__MODULE__{} = event) do
    XrWeb.Endpoint.broadcast("room:#{event.room_id}", "stoc", %{
      "event" => event.event_name,
      "payload" => event.payload
    })

    event
  end
end
