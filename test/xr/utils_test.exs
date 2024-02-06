defmodule Xr.Utils.Test do
  use ExUnit.Case, async: true

  alias Xr.Utils

  test "creates random string" do
    assert Utils.random_string() |> String.length() == 5
  end

  test "it inserts a state change into the ets table" do
    table = :ets.new(:table, [:set, :protected])
    Utils.insert("abc", :create, %{"position" => [1, 2, 3]}, table)

    assert [{id, %{create: %{"position" => [1, 2, 3]}, update: nil, delete: nil}}] =
             :ets.tab2list(table)

    assert id == "abc"
  end

  test "entities_diff" do
    table = :ets.new(:table, [:set, :protected])
    Utils.insert("abc", :create, %{"position" => [1, 2, 3]}, table)

    assert {:ok, %{creates: %{"abc" => %{"position" => [1, 2, 3]}}}} =
             Utils.get_entities_diff(table)

    Utils.insert("xyz", :delete, %{}, table)

    assert {:ok, %{creates: %{"abc" => %{"position" => [1, 2, 3]}}, deletes: %{"xyz" => %{}}}} =
             Utils.get_entities_diff(table)
  end

  test "entities_diff with nothing to sync" do
    table = :ets.new(:table, [:set, :protected])
    assert(:nothing_to_sync = Utils.get_entities_diff(table))
  end
end
