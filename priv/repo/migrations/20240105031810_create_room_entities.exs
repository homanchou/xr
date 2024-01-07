defmodule Xr.Repo.Migrations.CreateRoomEntities do
  use Ecto.Migration

  def change do
    create table(:room_entities, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :room_id, :uuid
      add :entity_id, :uuid
      add :component_name, :string
      add :component, :map

      timestamps(type: :utc_datetime)
    end

    create index(:room_entities, [:room_id, :entity_id])
    create index(:room_entities, [:entity_id, :component_name], unique: true)
  end
end
