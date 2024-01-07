defmodule XrWeb.PageControllerTest do
  use XrWeb.ConnCase

  test "GET /", %{conn: conn} do
    conn = get(conn, ~p"/")
    IO.inspect(html_response(conn, 200))
  end
end
