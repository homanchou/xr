defmodule Xr.Utils do
  def random_string(length \\ 5) do
    for _ <- 1..length,
        into: "",
        do: <<Enum.random(~c"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklkmnopqrstuvwxyz")>>
  end

  @doc """
  to_room_stream pipes an event to the room stream on Phoneix pubsub
  """
  def to_room_stream(room_id, event_name, payload) do
    Phoenix.PubSub.broadcast(Xr.PubSub, "room_stream:#{room_id}", %{
      "event" => event_name,
      "payload" => payload
    })
  end

  @doc """
  insert(entity_id, operation, payload, table)
  internal api to insert a state change into the ets table
   operation must be one of :create, :update, :delete
   payload is a map of components
   returns state with the entities_to_sync set updated
  """
  def insert(entity_id, operation, payload, table) when is_atom(operation) and is_map(payload) do
    case :ets.lookup(table, entity_id) do
      [] ->
        map =
          %{create: nil, update: nil, delete: nil}
          |> Map.put(operation, payload)

        :ets.insert(table, {entity_id, map})

      [{_key, map}] ->
        new_map =
          case operation do
            :update -> Map.put(map, operation, Map.merge(map[operation] || %{}, payload))
            _ -> Map.put(map, operation, payload)
          end

        :ets.insert(table, {entity_id, new_map})
    end

    # returns supplied entity_id
    {:ok, entity_id}
  end

  @doc """
  convert table contents into entities_diff payload
  """
  def get_entities_diff(table) when not is_list(table) do
    case :ets.tab2list(table) do
      [] -> :nothing_to_sync
      data -> get_entities_diff(data)
    end
  end

  def get_entities_diff(data) when is_list(data) do
    empty_diff = %{creates: %{}, updates: %{}, deletes: %{}}

    to_sink =
      Enum.reduce(data, empty_diff, fn {entity_id, row_value}, acc ->
        get_entities_diff(acc, entity_id, row_value)
      end)

    {:ok, to_sink}
  end

  def get_entities_diff(acc, entity_id, row_value) when is_map(acc) do
    Enum.reduce(row_value, acc, fn {op, components}, acc ->
      case {op, components} do
        {_, nil} ->
          acc

        {:create, components} ->
          Map.put(acc, :creates, Map.put(acc[:creates], entity_id, components))

        {:update, components} ->
          Map.put(acc, :updates, Map.put(acc[:updates], entity_id, components))

        {:delete, components} ->
          Map.put(acc, :deletes, Map.put(acc[:deletes], entity_id, components))
      end
    end)
  end
end
