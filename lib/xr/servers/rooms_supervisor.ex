defmodule Xr.Servers.RoomsSupervisor do
  use DynamicSupervisor

  def start_link(_arg) do
    DynamicSupervisor.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  def init(:ok) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  def start_room(room_id) do
    DynamicSupervisor.start_child(__MODULE__, {Xr.Servers.UserSnapshot, room_id})
    DynamicSupervisor.start_child(__MODULE__, {Xr.Servers.Reflector, room_id})
  end

  def stop_room(room_id) do
    DynamicSupervisor.terminate_child(
      __MODULE__,
      Xr.Servers.UserSnapshot.via_tuple(room_id) |> GenServer.whereis()
    )

    DynamicSupervisor.terminate_child(
      __MODULE__,
      Xr.Servers.Reflector.via_tuple(room_id) |> GenServer.whereis()
    )
  end
end
