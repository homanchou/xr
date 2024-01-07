defmodule Xr.Rooms.Entity do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "room_entities" do
    field :room_id, Ecto.UUID
    field :entity_id, Ecto.UUID
    field :component_name, :string
    field :component, :map

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(entity, attrs) do
    entity
    |> cast(attrs, [:room_id, :entity_id, :component_name, :component])
    |> validate_required([:room_id, :entity_id, :component_name, :component])
  end
end
