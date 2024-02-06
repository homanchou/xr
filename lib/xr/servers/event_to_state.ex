defmodule Xr.Servers.EventToState do
  # table is an ets table

  import Xr.Utils, only: [insert: 4]

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
  def process(_, _, _) do
    {:error, :not_handled}
  end
end
