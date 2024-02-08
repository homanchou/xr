## Persistent Presence

When we first join the room our camera is placed at the spawn_point.  If we then move about the space, travel to a new location then refresh the window, we might expect to resume our previous position but instead we're always teleported back to the original spawn_point.

To address this issue we'll add a helper function to `rooms.ex` to lookup an entity's state:

```elixir

  def get_entity_state(room_id, entity_id) do
    components_for_entity_id(room_id, entity_id)
    |> components_to_map()
    |> Map.values()
    |> List.first()
  end

  def components_for_entity_id(room_id, entity_id) do
    Repo.all(
      from e in Xr.Rooms.Component,
        where: e.room_id == ^room_id and e.entity_id == ^entity_id
    )
  end
```

Then we can use this `get_entity_state` function back in `presence.ex`:

```elixir
def emit_joined(room_id, user_id) do
  case Rooms.get_entity_state(room_id, user_id) do
    nil ->
      default_rotation = [0, 0, 0, 1]

      default_user_state = %{
        "color" => Xr.Rooms.create_random_color(),
        "tag" => "avatar",
        "pose" => %{
          "head" => Rooms.get_head_position_near_spawn_point(room_id) ++ default_rotation
        },
        "user_id" => user_id
      }

      Xr.Utils.to_room_stream(room_id, "user_joined", default_user_state)

    components ->
      # resume previous user state
      Xr.Utils.to_room_stream(room_id, "user_joined", Map.put(components, "user_id", user_id))
  end
end
```

First we check if we have some previous component data for the entity.  If we don't then we'll use the spawn_point data.  If we do have previous component data then we'll use that in the room_event and when the frontend picks it up we'll pick up the same position we last left off at.

There's just one problem with this.  When we close our browser, that will generate a "user_left" event which will generate an "entities_diff" event which is listened to by our EntitiesState GenServer which then deletes the entity from the database.

To solve this problem we can introduce a soft delete into the components table.  That way no record is truely deleted.  Instead we'll just set a timestamp on delete_at column.  When we query the entities in the room we'll query only the entities and components that have deleted_at null.  But when we use `Rooms.get_entity_state` we will ignore the soft_delete and be able to recover the user's previous component data.

### At deleted_at

We can create a new migration (I'm just updating the same one since I'm lazy and I'll destroy my local db anyway).  If you've already deployed somewhere or using CI/CD you must create a new migration.

```elixir
    ...
    add :deleted_at, :utc_datetime, null: true, default: nil
    ...
```

### Modify Helper Functions

Update the functions in `rooms.ex` to be deleted_at aware.

```elixir
  def components(room_id) do
    Repo.all(
      from e in Xr.Rooms.Component,
        where: e.room_id == ^room_id and is_nil(e.deleted_at),
        order_by: e.entity_id
    )
  end
```

Add a soft delete function too.

```elixir
  def soft_delete_entity(room_id, entity_id) do
    from(c in Xr.Rooms.Component,
      where: c.room_id == ^room_id and c.entity_id == ^entity_id
    )
    |> Repo.update_all(set: [deleted_at: DateTime.utc_now()])
  end
```

We've introduced another problem now, and that's that we have a unique constraint on entity_id and component_name.  But what happens is that if we only soft_delete users, when the user rejoins the room, the "entities_diff" operation will cause us to create the entity with the same id.  We can fix this by doing an upsert operation.  

```elixir
  def create_entity(room_id, entity_id, components = %{}) do
    # loop through components
    for {component_name, component_value} <- components do
      %Xr.Rooms.Component{
        room_id: room_id,
        entity_id: entity_id,
        component_name: component_name,
        component: %{component_name => component_value}
      }
      |> Xr.Repo.insert!(
        on_conflict: [set: [component: %{component_name => component_value}, deleted_at: nil]],
        conflict_target: [:entity_id, :component_name]
      )
    end
  end
```
The on_conflict option will set the component new value and remove any deleted_at timestamp if there was an insert conflict.  Likewise if we're updating any component then we should remove any deleted_at timestamp as well.

```elixir
  def update_component(room_id, entity_id, component_name, component_value) do
    case Repo.get_by(Xr.Rooms.Component,
           room_id: room_id,
           entity_id: entity_id,
           component_name: component_name
         ) do
      nil ->
        :noop

      component ->
        component
        |> Xr.Rooms.Component.changeset(%{
          component: %{component_name => component_value},
          deleted_at: nil
        })
        |> Repo.update()
    end
  end
```


### Write Some Tests

Add another test to `rooms_test.exs` to make sure soft_delete and upsert works as expected:

```elixir

    test "recreate soft deleted entity is ok" do
      room = room_fixture()
      user_id = Xr.Utils.random_string()
      Rooms.create_entity(room.id, user_id, %{"pose" => %{"head" => [0, 0, 0, 1, 2, 3, 4]}})
      assert Rooms.entities(room.id) |> Map.keys() |> Enum.count() == 1
      Rooms.soft_delete_entity(room.id, user_id)
      assert Rooms.entities(room.id) |> Map.keys() |> Enum.count() == 0
      Rooms.create_entity(room.id, user_id, %{"pose" => %{"head" => [0, 0, 0, 1, 2, 3, 4]}})
      assert Rooms.entities(room.id) |> Map.keys() |> Enum.count() == 1
    end
```


Finally let's use the soft_delete function when we are processing the "entities_diff" event:

```elixir
  def update_entities(room_id, %{creates: creates, updates: updates, deletes: deletes}) do
    for {entity_id, components} <- creates do
      create_entity(room_id, entity_id, components)
    end

    for {entity_id, components} <- updates do
      for {component_name, component_value} <- components do
        update_component(room_id, entity_id, component_name, component_value)
      end
    end

    # soft delete
    for {entity_id, components} <- deletes do
      for {component_name, component_value} <- components do
        update_component(room_id, entity_id, component_name, component_value)
      end

      soft_delete_entity(room_id, entity_id)
    end
  end
```

### Summary

In this chapter we added the ability to retain the previous camera position and rotation after a browser refresh.  We add this ability to query the user's entity value by introducing soft_delete.  We added a deleted_at column to the components table.  We modified helper functions to support new queries and update functions.  