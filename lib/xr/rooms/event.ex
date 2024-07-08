defmodule Xr.Rooms.Event do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "events" do
    field :payload, :map
    field :sequence, :integer
    field :event_name, :string
    field :room_id, :string

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(event, attrs) do
    event
    |> cast(attrs, [:sequence, :event_name, :payload])
    |> validate_required([:sequence, :event_name])
  end
end
