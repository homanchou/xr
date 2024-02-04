defmodule Xr.Servers.State do
  use GenServer
  alias Phoenix.PubSub

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
    Process.send_after(self(), :sync, 1000)
    {:ok, %{room_id: room_id, table: table, entities_to_sync: MapSet.new()}}
  end

  # responds to incoming message from the room stream
  @impl true
  def handle_info(:sync, state) do

    empty_diff = %{creates: %{}, updates: %{}, deletes: %{}}
    to_sync = MapSet.to_list(state.entities_to_sync) |>
      Enum.reduce(empty_diff, fn entity_id, acc ->
        [{_, %{create: create, update: update, delete: delete}}] = :ets.lookup(state.table, entity_id)
        acc = if(create != nil, do: Map.put(acc, :creates, Map.put(acc[:creates], entity_id, create)), else: acc)
        acc = if(update != nil, do: Map.put(acc, :updates, Map.put(acc[:updates], entity_id, update)), else: acc)
        acc = if(delete != nil, do: Map.put(acc, :deletes, Map.put(acc[:deletes], entity_id, delete)), else: acc)
        acc
      end)
      #only sync if there is something to sync
    state = if to_sync != empty_diff do
      # broad cast on channel
      XrWeb.Endpoint.broadcast("room:" <> state.room_id, "state_diff", to_sync)

      # clear the ets table
      :ets.delete_all_objects(state.table)
      # clear the entities to sync
      %{state | entities_to_sync: MapSet.new()}
    else
      state
    end
    Process.send_after(self(), :sync, 1000)
    {:noreply, state}
  end

  def handle_info(%{"event" => "user_joined", "payload" => payload}, state) do
    state = insert(payload["user_id"], :create, Map.drop(payload, ["user_id"]), state)
    {:noreply, state}
  end

  @impl true
  def handle_info(%{"event" => "user_left"}, state) do
    # no need to do anything for now
    {:noreply, state}
  end


  def handle_info(%{"event" => "user_moved", "payload" => payload}, state) do
    state = insert(payload["user_id"], :update, Map.drop(payload, ["user_id"]), state)
    {:noreply, state}
  end

  # ignore all other incoming messages from the room stream
  @impl true
  def handle_info(msg, state) do
    IO.inspect(msg, label: "unhandled message")
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

  # internal api to get all user states, returns a map of user_id to user_state
  def handle_call(:state, _from, state) do
    # get cache of movements
    list = :ets.tab2list(state.table)

    result =
      Enum.reduce(list, %{}, fn {key, value}, acc ->
        Map.put(acc, key, value)
      end)

    {:reply, result, state}
  end

  # internal api to insert a state change into the ets table
  # operation must be one of :create, :update, :delete
  # returns state with the entities_to_sync set updated
  def insert(entity_id, operation, payload, state) when is_atom(operation) and is_map(payload) do
    Task.async(fn ->
      case :ets.lookup(state.table, entity_id) do
        [] ->
          map = %{:create => nil, :update => nil, :delete => nil}
            |> Map.put(operation, payload)
          :ets.insert(state.table, {entity_id, map})
        [{_key, map}] ->
          new_map = case operation do
              :update -> Map.put(map, operation, Map.merge(map[operation] || %{}, payload))
              _ ->  Map.put(map, operation, payload)
            end
          :ets.insert(state.table, {entity_id, new_map})
      end
    end)
    %{state | entities_to_sync: MapSet.put(state.entities_to_sync, entity_id)}
  end
end
