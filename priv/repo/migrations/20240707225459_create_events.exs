defmodule Xr.Repo.Migrations.CreateEvents do
  use Ecto.Migration

  def change do
    create table(:events, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :sequence, :integer, null: false, default: 0
      add :event_name, :string, null: false
      add :payload, :map, default: %{}
      add :room_id, references(:rooms, on_delete: :delete_all, type: :string)

      timestamps(type: :utc_datetime)
    end

    create index(:events, [:room_id])
  end
end
