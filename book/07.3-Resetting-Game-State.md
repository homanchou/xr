
### Create Snippet Table

Our components table is designed to be able to easily update particular components.  As the game proceeds and the state changes we'll be able to keep the database updated with the latest state of the world.  However when the game is over and we want to reset to the original state we'll need a separate place to store this snapshot and restore it into the components table.

```bash
mix phx.gen.schema Rooms.Snippet snippets room_id:references:rooms type:string slug:string data:map
```