defmodule Xr.Repo.Migrations.CreateComponents do
  use Ecto.Migration

  def change do
    create table(:components, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :entity_id, :string, null: false
      add :component_name, :string, null: false
      add :component, :map, null: false, default: %{}
      add :room_id, references(:rooms, on_delete: :delete_all, type: :string)

      timestamps(type: :utc_datetime)
    end

    create index(:components, [:room_id, :entity_id])
    # helps look up tags
    create index(:components, [:room_id, :component_name])
    create index(:components, [:entity_id, :component_name], unique: true)
  end
end
