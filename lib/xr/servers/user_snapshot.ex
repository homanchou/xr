defmodule Xr.Servers.UserSnapshot do
  use GenServer
  alias Phoenix.PubSub

  def via_tuple(room_id) do
    {:via, Registry, {Xr.RoomsRegistry, room_id}}
  end

  def start_link(room_id) do
    GenServer.start_link(__MODULE__, {:ok, room_id}, name: via_tuple(room_id))
  end
  @impl true
  def init({:ok, room_id}) do
    PubSub.subscribe(Xr.PubSub, "room:#{room_id}")
    {:ok, %{}}
  end

  @impl true
  def handle_info(msg, state) do
    IO.inspect(msg, label: "user snapshot not handling")
    {:noreply, state}
  end

end
