defmodule XrWeb.EventController do
  use XrWeb, :controller

  alias Xr.Rooms

  def index(conn, %{"room_id" => room_id}) do
    events = Rooms.list_room_events(room_id)
    render(conn, :index, events: events)
  end
end
