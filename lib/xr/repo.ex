defmodule Xr.Repo do
  use Ecto.Repo,
    otp_app: :xr,
    adapter: Ecto.Adapters.Postgres
end
