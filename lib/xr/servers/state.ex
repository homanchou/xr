defmodule Xr.Servers.State do
  use GenServer
  alias Phoenix.PubSub

  @sync_interval 200
  # creates a tuple that will automatically map a string "user_states:#{room_id}" to this new process
  def via_tuple(room_id) do
    {:via, Registry, {Xr.RoomsRegistry, "state:#{room_id}"}}
  end

  def start_link(room_id) do
    GenServer.start_link(__MODULE__, {:ok, room_id}, name: via_tuple(room_id))
  end

  # client api to get entity state
  def entity_state(room_id, entity_id) do
    GenServer.call(via_tuple(room_id), {:entity, entity_id})
  end

  # client api to get all user states, return a maps of user_ids to state
  def state(room_id) do
    GenServer.call(via_tuple(room_id), :state)
  end

  @impl true
  def init({:ok, room_id}) do
    # subscribe to the room stream
    PubSub.subscribe(Xr.PubSub, "room_stream:#{room_id}")

    # create an ets table
    table =
      :ets.new(:room_state, [
        :set,
        :public,
        {:write_concurrency, true},
        {:read_concurrency, true}
      ])

    Process.send_after(self(), :sync, @sync_interval)
    {:ok, %{room_id: room_id, table: table, entities_to_sync: MapSet.new()}}
  end

  # responds to incoming message from the room stream
  @impl true
  def handle_info(:sync, state) do
    Process.send_after(self(), :sync, @sync_interval)

    case Xr.Utils.get_entities_diff(
           MapSet.to_list(state.entities_to_sync),
           state.table
         ) do
      {:ok, to_sync} ->
        XrWeb.Endpoint.broadcast("room:" <> state.room_id, "entities_diff", to_sync)

        # clear the ets table
        :ets.delete_all_objects(state.table)
        # clear the entities to sync
        {:noreply, %{state | entities_to_sync: MapSet.new()}}

      _ ->
        {:noreply, state}
    end
  end

  def handle_info(%{"event" => event, "payload" => payload}, state) do
    state = process(event, payload, state)
    {:noreply, state}
  end

  # internal api to get user state
  @impl true
  def handle_call({:entity, entity_id}, _from, state) do
    result =
      case :ets.lookup(state.table, entity_id) do
        [] -> nil
        [{_key, value}] -> value
      end

    {:reply, result, state}
  end

  # internal api to get all user states, returns a map
  def handle_call(:state, _from, state) do
    # get cache of movements
    list = :ets.tab2list(state.table)

    result =
      Enum.reduce(list, %{}, fn {key, value}, acc ->
        Map.put(acc, key, value)
      end)

    {:reply, result, state}
  end

  def process(event_name, payload, state) do
    case Xr.Servers.EventToState.process(event_name, payload, state.table) do
      {:ok, entity_id} ->
        %{state | entities_to_sync: MapSet.put(state.entities_to_sync, entity_id)}

      {:error, _} ->
        state
    end
  end
end
