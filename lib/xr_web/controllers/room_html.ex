defmodule XrWeb.RoomHTML do
  use XrWeb, :html

  embed_templates "room_html/*"

  @doc """
  Renders a room form.
  """
  attr :changeset, Ecto.Changeset, required: true
  attr :action, :string, required: true

  def room_form(assigns)
end
