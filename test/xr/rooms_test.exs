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
             |> IO.inspect(label: "entities")
             |> Map.keys()
             |> Enum.count() == 2
    end
  end
end
