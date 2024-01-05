defmodule Xr.Servers.UserSnapshot do
  use GenServer

  def start_link() do
    GenServer.start_link(__MODULE__, [])
  end

  def user_moved(pid, payload) do
    GenServer.cast(pid, {:user_moved, payload})
  end

  @impl true
  def init([]) do
    {:ok, %{users: %{}}}
  end

  @impl true
  def handle_cast(
        {:user_moved, %{"user_id" => user_id, "position" => position, "rotation" => rotation}},
        state
      ) do
    {:noreply,
     %{
       state
       | users: Map.put(state.users, user_id, %{"position" => position, "rotation" => rotation})
     }}
  end
end
