defmodule Xr.RoomsTest do
  use Xr.DataCase

  alias Xr.Rooms

  # describe "rooms" do
  #   alias Xr.Rooms.Room

  #   import Xr.RoomsFixtures

  #   @invalid_attrs %{name: nil, description: nil}

  #   test "list_rooms/0 returns all rooms" do
  #     room = room_fixture()
  #     assert Rooms.list_rooms() == [room]
  #   end

  #   test "get_room!/1 returns the room with given id" do
  #     room = room_fixture()
  #     assert Rooms.get_room!(room.id) == room
  #   end

  #   test "create_room/1 with valid data creates a room" do
  #     valid_attrs = %{name: "some name", description: "some description"}

  #     assert {:ok, %Room{} = room} = Rooms.create_room(valid_attrs)
  #     assert room.name == "some name"
  #     assert room.description == "some description"
  #   end

  #   test "create_room/1 with invalid data returns error changeset" do
  #     assert {:error, %Ecto.Changeset{}} = Rooms.create_room(@invalid_attrs)
  #   end

  #   test "update_room/2 with valid data updates the room" do
  #     room = room_fixture()
  #     update_attrs = %{name: "some updated name", description: "some updated description"}

  #     assert {:ok, %Room{} = room} = Rooms.update_room(room, update_attrs)
  #     assert room.name == "some updated name"
  #     assert room.description == "some updated description"
  #   end

  #   test "update_room/2 with invalid data returns error changeset" do
  #     room = room_fixture()
  #     assert {:error, %Ecto.Changeset{}} = Rooms.update_room(room, @invalid_attrs)
  #     assert room == Rooms.get_room!(room.id)
  #   end

  #   test "delete_room/1 deletes the room" do
  #     room = room_fixture()
  #     assert {:ok, %Room{}} = Rooms.delete_room(room)
  #     assert_raise Ecto.NoResultsError, fn -> Rooms.get_room!(room.id) end
  #   end

  #   test "change_room/1 returns a room changeset" do
  #     room = room_fixture()
  #     assert %Ecto.Changeset{} = Rooms.change_room(room)
  #   end
  # end

  describe "entities" do
    alias Xr.Rooms.Room

    import Xr.RoomsFixtures

    # when a room is created we need a function to call
    # to create some random entities

    # a room holds it's entities in a db"

    # The db of entities can be exported into a json snippet

    # the room db is initiated with json snippet

    # room db can be exported to json snippet

    test "create_entity/3 with valid data creates a entity" do
      room = room_fixture()

      Rooms.create_entity(room.id, Xr.Utils.random_string(5), %{
        "mesh_builder" => "box",
        "position" => [1, 2, 3]
      })

      Rooms.create_entity(room.id, Xr.Utils.random_string(5), %{
        "mesh_builder" => "floor",
        "position" => [4, 0, -1]
      })

      assert Rooms.entities(room.id)
             |> Map.keys()
             |> Enum.count() == 2
    end

    test "recreate soft deleted entity is ok" do
      room = room_fixture()
      user_id = Xr.Utils.random_string()
      Rooms.create_entity(room.id, user_id, %{"pose" => %{"head" => [0, 0, 0, 1, 2, 3, 4]}})
      assert Rooms.entities(room.id) |> Map.keys() |> Enum.count() == 1
      Rooms.soft_delete_entity(room.id, user_id)
      assert Rooms.entities(room.id) |> Map.keys() |> Enum.count() == 0
      Rooms.create_entity(room.id, user_id, %{"pose" => %{"head" => [0, 0, 0, 1, 2, 3, 4]}})
      assert Rooms.entities(room.id) |> Map.keys() |> Enum.count() == 1
    end

    test "create snippet" do
      room = room_fixture()
      snippet = Rooms.create_snippet(room.id, "some kind", "some slug", %{"some" => "data"})
      assert snippet.room_id == room.id
    end

    # save room entities to snapshot
    test "save entities to snapshot then load entities from snapshot" do
      room = room_fixture()

      Rooms.create_entity(room.id, Xr.Utils.random_string(5), %{
        "mesh_builder" => "box",
        "position" => [1, 2, 3]
      })

      Rooms.create_entity(room.id, Xr.Utils.random_string(5), %{
        "mesh_builder" => "floor",
        "position" => [4, 0, -1]
      })

      Rooms.save_entities_to_initial_snapshot(room.id)
      assert Rooms.snippets(room.id) |> Enum.count() == 1

      Rooms.delete_entities(room.id)
      assert Rooms.entities(room.id) == %{}

      Rooms.replace_entities_with_initial_snapshot(room.id)
      assert Rooms.entities(room.id) |> Map.keys() |> Enum.count() == 2
    end

    test "find entities by component name" do
      room = room_fixture()

      Rooms.create_entity(room.id, Xr.Utils.random_string(5), %{
        "tag" => "spawn_point",
        "position" => [0, 0, 0]
      })

      {:ok, entity} = Rooms.find_entities_having_component(room.id, "tag")
      assert entity |> Map.keys() |> Enum.count() == 1
      assert entity |> Map.values() |> List.first() |> Map.keys() |> Enum.count() == 2
    end

    test "find entities by component name and value" do
      room = room_fixture()

      Rooms.create_entity(room.id, Xr.Utils.random_string(5), %{
        "tag" => "spawn_point",
        "position" => [0, 0, 0]
      })

      {:ok, entity} = Rooms.find_entities_having_component(room.id, "tag", "spawn_point")
      assert entity |> Map.keys() |> Enum.count() == 1
      assert entity |> Map.values() |> List.first() |> Map.keys() |> Enum.count() == 2
    end

    test "get position near spawn point" do
      room = room_fixture()

      Rooms.create_entity(room.id, Xr.Utils.random_string(5), %{
        "tag" => "spawn_point",
        "position" => [0, 0, 0]
      })

      position = Rooms.get_head_position_near_spawn_point(room.id)
      assert position |> length() == 3
      assert position != [0, 0, 0]
    end
  end
end
