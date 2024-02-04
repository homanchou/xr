defmodule Xr.Rooms.Snippet do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "snippets" do
    field :data, :map
    field :type, :string
    field :slug, :string
    field :room_id, :string

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(snippet, attrs) do
    snippet
    |> cast(attrs, [:type, :slug, :data])
    |> validate_required([:type, :slug, :data])
  end
end
