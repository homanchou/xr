defmodule Xr.Rooms.Component do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "components" do
    field :entity_id, Ecto.UUID
    field :component_name, :string
    field :component, :map
    field :room_id, :binary_id

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(component, attrs) do
    component
    |> cast(attrs, [:room_id, :entity_id, :component_name, :component])
    |> validate_required([:room_id, :entity_id, :component_name, :component])
  end
end
