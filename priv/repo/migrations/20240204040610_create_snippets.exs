defmodule Xr.Repo.Migrations.CreateSnippets do
  use Ecto.Migration

  def change do
    create table(:snippets, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :type, :string, null: false
      add :slug, :string, null: false
      add :data, :map, null: false, default: %{}
      add :room_id, references(:rooms, on_delete: :delete_all, type: :string)

      timestamps(type: :utc_datetime)
    end

    create index(:snippets, [:room_id])
  end
end
