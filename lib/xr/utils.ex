defmodule Xr.Utils do

  def random_string(length \\ 5) do
    for _ <- 1..length,
        into: "",
        do: <<Enum.random('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklkmnopqrstuvwxyz')>>
  end

end
