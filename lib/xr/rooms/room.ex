defmodule Xr.Rooms.Room do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :string, autogenerate: false}
  @foreign_key_type :string
  schema "rooms" do
    field :name, :string
    field :description, :string

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(room, attrs) do
    room
    |> cast(attrs, [:name, :description])
    |> validate_required([:name])
  end
end
