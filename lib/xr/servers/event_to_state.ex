defmodule Xr.Servers.EventToState do
  # table is an ets table

  def process("user_joined", payload, table) do
    insert(payload["user_id"], :create, Map.drop(payload, ["user_id"]), table)
  end

  def process("user_left", payload, table) do
    insert(payload["user_id"], :delete, Map.drop(payload, ["user_id"]), table)
  end

  def process("user_moved", payload, table) do
    insert(payload["user_id"], :update, Map.drop(payload, ["user_id"]), table)
  end

  # unhandled event
  def process(_,_,_) do
    {:error, :not_handled}
  end

  # internal api to insert a state change into the ets table
  # operation must be one of :create, :update, :delete
  # returns state with the entities_to_sync set updated
  def insert(entity_id, operation, payload, table) when is_atom(operation) and is_map(payload) do
    case :ets.lookup(table, entity_id) do
      [] ->
        map =
          %{:create => nil, :update => nil, :delete => nil}
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
end
