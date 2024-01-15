defmodule Xr.Servers.UserSnapshot do
  use GenServer
  alias Phoenix.PubSub

  # creates a tuple that will automatically map a string "user_states:#{room_id}" to this new process
  def via_tuple(room_id) do
    {:via, Registry, {Xr.RoomsRegistry, "user_states:#{room_id}"}}
  end

  def start_link(room_id) do
    GenServer.start_link(__MODULE__, {:ok, room_id}, name: via_tuple(room_id))
  end

  # client api to get user state
  def get_user_state(room_id, user_id) do
    GenServer.call(via_tuple(room_id), {:get_user_state, user_id})
  end

  # client api to get all user states
  def all_user_states(room_id) do
    GenServer.call(via_tuple(room_id), :all_user_states)
  end

  @impl true
  def init({:ok, room_id}) do
    # subscribe to the room stream
    PubSub.subscribe(Xr.PubSub, "room_stream:#{room_id}")

    # create an ets table
    table =
      :ets.new(:user_states, [
        :set,
        :public,
        {:write_concurrency, true},
        {:read_concurrency, true}
      ])

    {:ok, table}
  end

  # responds to incoming message from the room stream
  @impl true
  def handle_info(%{"event" => "user_moved", "payload" => payload}, state) do
    # insert into the ets table asynchronously
    Task.start_link(fn ->
      :ets.insert(
        state,
        {payload["user_id"], Map.reject(payload, fn {k, _} -> k == "user_id" end)}
      )
    end)

    {:noreply, state}
  end

  # ignore all other incoming messages from the room stream
  @impl true
  def handle_info(_, state) do
    {:noreply, state}
  end

  # internal api to get user state
  @impl true
  def handle_call({:get_user_state, user_id}, _from, state) do
    result =
      case :ets.lookup(state, user_id) do
        [] -> nil
        [{_key, value}] -> value
      end

    {:reply, result, state}
  end

  # internal api to get all user states
  def handle_call(:all_user_states, _from, state) do
    # get cache of movements
    list = :ets.tab2list(state)

    result =
      Enum.reduce(list, %{}, fn {key, value}, acc ->
        Map.put(acc, key, value)
      end)

    {:reply, result, state}
  end
end
