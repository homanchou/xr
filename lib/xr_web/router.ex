defmodule XrWeb.Router do
  use XrWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {XrWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug :maybe_assign_user_id
    plug :put_user_token
  end

  def maybe_assign_user_id(conn, _) do
    case get_session(conn, :user_id) do
      nil ->
        user_id = Xr.Utils.random_string()
        conn |> put_session(:user_id, user_id) |> assign(:user_id, user_id)

      existing_id ->
        conn |> assign(:user_id, existing_id)
    end
  end

  defp put_user_token(conn, _) do
    if user_id = conn.assigns[:user_id] do
      token = Phoenix.Token.sign(conn, "some salt", user_id)
      assign(conn, :user_token, token)
    else
      conn
    end
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", XrWeb do
    pipe_through :browser

    get "/", PageController, :home

    resources "/rooms", RoomController
    # live "/rooms", RoomLive.Index, :index
    # live "/rooms/new", RoomLive.Index, :new
    # live "/rooms/:id/edit", RoomLive.Index, :edit

    # live "/rooms/:id", RoomLive.Show, :show
    # live "/rooms/:id/show/edit", RoomLive.Show, :edit
  end

  # Other scopes may use custom stacks.
  # scope "/api", XrWeb do
  #   pipe_through :api
  # end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:xr, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: XrWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end
end
