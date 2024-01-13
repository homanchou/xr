defmodule Xr.Repo.Migrations.CreateComponents do
  use Ecto.Migration

  def change do
    create table(:components, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :entity_id, :uuid
      add :component_name, :string
      add :component, :map
      add :room_id, references(:rooms, on_delete: :delete_all, type: :binary_id)

      timestamps(type: :utc_datetime)
    end

    create index(:components, [:room_id, :entity_id])
    # helps look up tags
    create index(:components, [:room_id, :component_name])
    create index(:components, [:entity_id, :component_name], unique: true)
  end
end
