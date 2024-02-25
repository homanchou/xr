defmodule Xr.RoomEvents.StateMutation do
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

  def process(
        "user_picked_up",
        %{"user_id" => user_id, "target_id" => target_id, "hand" => hand},
        table
      ) do
    # avatar is created with these meshes
    # const leftId = (user_id: string) => `${user_id}:left`;
    # const rightId = (user_id: string) => `${user_id}:right`;

    insert("#{user_id}:#{hand}", :update, %{"parenting" => target_id}, table)
  end

  # unhandled event
  def process(_, _, _) do
    {:error, :not_handled}
  end
end
