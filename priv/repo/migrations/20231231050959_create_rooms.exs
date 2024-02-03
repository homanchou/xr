defmodule Xr.Repo.Migrations.CreateRooms do
  use Ecto.Migration

  def change do
    create table(:rooms, primary_key: false) do
      add :id, :string, primary_key: true
      add :name, :string, null: false
      add :description, :string, default: ""

      timestamps(type: :utc_datetime)
    end
  end
end
