defmodule XrWeb.RoomMenu.Index do
  use XrWeb, :live_view

  @impl true
  def mount(_params, %{"user_id" => user_id, "room_id" => room_id}, socket) do
    {:ok,
     assign(socket,
       user_id: user_id,
       room_id: room_id,
       entered: false
     ), layout: false}
  end
end
