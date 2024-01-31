
### Restructuring for Systems

So far we've just been dealing with a single file `app.ts` but that will become unwieldy soon.  

It would be good to split the code base up into managable files with each file responsible for some particular feature of our game room.  

Let's create a folder in `assets/js` called `systems`.  We will be adding more and more files to this `systems` folder.  Each file will handle one particular concern.

Our first system wil be called `broker.ts` and that system is responsible for connecting to the `RoomChannel` as we did previously.  Let's create another file called `scene.ts` that is responsible for creating an HTML canvas on the page to draw our 3D scene.  

We need a mechanism to share data between systems.  For example, the `broker.ts` system needs to know the room_id in order to join the channel.  The `scene.ts` will need to be able to share the `BABYLON.Scene` object that it creates because other systems may need to interact with it.

#### Add config.ts

To solve this, let's create a file called `assets/js/config.ts` and define a type called Config that will contain variables that we need to share between systems.

```typescript
import type { Socket, Channel } from "phoenix"
import type { Scene } from "@babylonjs/core/scene"

export type Config = {
  room_id: string
  user_id: string
  scene: Scene
  socket: Socket
  channel: Channel
}

export const config: Config = {
  room_id: "",
  user_id: "",
  scene: null,
  socket: null
  channel: null
}
```

This file creates initializes and exports a `config` variable.  When other typescript files import this file they'll get access to the same `config` and can read or write to it.  Since we are using a stripc type and not a regular javascript object we cannot add arbitrary new properties at will.  Anytime we feel the urge to add a new property we'll need to add it to the Config type.  That may be a chore but the benefit is that we have types and intellisense will help remind us what common shared variables are available.



#### Add broker.ts

Now let's create the `assets/js/systems/broker.ts`

```typescript
import { config } from "../config";

// channel connection
const socket = config.socket;
socket.connect();
let channel = socket.channel(`room:${config.room_id}`, {});
config.channel = channel;
channel.join()
  .receive("ok", resp => { console.log("Joined successfully", resp); })
  .receive("error", resp => { console.log("Unable to join", resp); });

channel.on("shout", payload => {
  console.log("I received a 'shout'", payload);
});

```

This should look familiar as it is just a port of the code we had before for joining a channel.  Except we are getting the socket and room_id from the config.  

#### Add scene.ts

Now create `assets/js/systems/scene.ts`.  This file will inject a 3D scene onto the page by creating a canvas.

```typescript
import { config } from "../config";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { Scene } from "@babylonjs/core/scene";

import { GridMaterial } from "@babylonjs/materials/grid/gridMaterial";
import "@babylonjs/core/Materials/standardMaterial";

// create the canvas html element and attach it to the webpage
const canvas = document.createElement("canvas");
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.id = "gameCanvas";
canvas.style.zIndex = "1"; // don't put this too high, it blocks the VR button
canvas.style.position = "absolute";
canvas.style.top = "0";
canvas.style.touchAction = "none";
canvas.style.outline = "none";
document.body.appendChild(canvas);

// initialize babylon scene and engine
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
config.scene = scene;
// This creates and positions a free camera (non-mesh)

// create a birds-eye-view pointed at the origin
const default_position = new Vector3(0, 15, 50);
const camera = new FreeCamera("my head", default_position, scene);

// This targets the camera to scene origin
camera.setTarget(Vector3.Zero());

// This attaches the camera to the canvas
camera.attachControl(canvas, true);
new HemisphericLight("light1", new Vector3(1, 1, 0), scene);

// Create a grid material
const material = new GridMaterial("grid", scene);

// Our built-in 'sphere' shape.
const sphere = CreateSphere("sphere1", { segments: 16, diameter: 2 }, scene);

// Move the sphere upward 1/2 its height
sphere.position.y = 2;

// Our built-in 'ground' shape.
const ground = CreateGround("ground1", { width: 100, height: 100, subdivisions: 2 }, scene);

// Affect a material
ground.material = material;

// hide/show the Inspector
window.addEventListener("keydown", async (ev) => {

  if (ev.ctrlKey && ev.key === 'b') {
    await import("@babylonjs/core/Debug/debugLayer");
    await import("@babylonjs/inspector");
    console.log("invoking the debug layer");
    if (scene.debugLayer.isVisible()) {
      scene.debugLayer.hide();
    } else {
      scene.debugLayer.show({ embedMode: true });
    }
  }
});

window.addEventListener("resize", function () {
  engine.resize();
});

// run the main render loop
engine.runRenderLoop(() => {
  scene.render();
});


```
The `scene.ts` contains typical Babylon.js getting started boilerplate to setup a canvas, engine, camera and scene.  It also includes a shortcut hotkey combo to open the inspector if we need to do some debugging (notice we use async imports in order to keep the bundle size smaller by taking advantage of esbuild's code splitting feature).  The scene is created in this file and then assigned to the `scene` key in the `config` object.  It's important that any systems that need to make use of `config.scene` be evaluated after `config.scene` is available.

#### Add systems.ts

To tie all the systems together, we need to import each system in the correct order.  Add this file `assets/js/systems.ts` to load each system we've made so far.

```typescript
import "./systems/broker";
import "./systems/scene";
```

Whenever we add a new system, we'll need to update the system.ts file or the new system won't be reachable.

Finally the system.ts file we just made must also be included in our entry point file or it also won't be reachable.

### Update app.ts

```typescript

window["initRoom"] = async (room_id: string, user_id: string) => {
  const { config } = await import("./config");
  config.room_id = room_id;
  config.user_id = user_id;
  config.socket = liveSocket;
  await import("./systems");
};
```
The `initRoom` function is now responsible for invoking `config` for the first time, and populating some important shared data like the socket, room_id and user_id into the config so it's available to any other code that imports `config`.  It also imports `systems` which imports all the systems we just created.  Again we use dynamic imports so that if initRoom is never called none of the Babylon.js and room related code needs to be loaded, which keeps the rest of the pages unhindered by large js bundles.

Remember that this `initRoom` function is only invoked by the `show.html.heex` template if it renders:

```html
<body>
<script>
  window.addEventListener("DOMContentLoaded", function() {
    window.initRoom("<%= @room.id %>", "<%= @user_id %>")
  })
</script>
</body>
```

You should end up with a `assets/js` folder structure like this, setting us up to create more and more systems:

```
├── app.ts
├── config.ts
├── systems.ts
└── systems
    ├── broker.ts
    └── scene.ts
```


Open up your browser and navigate to a specific room URL and you should see a 3D scene.  Our camera is also already integrated with the keyboard and mouse so you can travel around in the scene, by clicking and dragging your mouse and then using the cursor keys to move forward or backward.  To open up the Babylon.js inspector we've added a short-cut (CTRL-b), so that we can inspect the meshes in the scene.  


## Adding RXJS

There is one more important library that I think is super useful for sharing realtime data between our systems and that is RxJS.  RxJS is "a library for composing asynchronous and event-based programs by using observable sequences".  This is a fancy way of saying that not only can we do regular pub/sub of events, we can do tricky things such as wait for one event to happen first before doing something else, or wait for two different events to have happened before triggering a behavior, or making  sure something happens just once, etc.  It's very powerful and often has a cleaner more declarative API compared to more imperative loops that have more temp variables hanging around.

The main api we will be using from RxJS is `Subject`.  Think of a Subject as an event bus where you can push messages into it with `next(...data...)` and subscribe to the data using `subscribe(callback)`.

RxJS then provides a bunch of useful ways to pipe, filter, combine, throttle, transform events from multiple streams of data.  I often reference https://rxmarbles.com/ to visualize how the data flows.

Let's install rxjs from our `assets` directory:

```bash
npm i rxjs
```

Let's modify `config.ts` to add some `rxjs.Subject` that we can use later.

```typescript
import type { Channel, Socket } from "phoenix";
import type { Scene } from "@babylonjs/core/scene";
import type { Vector3, Quaternion } from "@babylonjs/core/Maths";
import { Subject } from "rxjs/internal/Subject";


export type Config = {
  room_id: string;
  user_id: string;
  scene: Scene;
  socket: Socket;
  channel: Channel;
  $room_stream: Subject<{ event: string, payload: any; }>;
  $channel_joined: Subject<boolean>;
  $room_entered: Subject<boolean>;
  $camera_moved: Subject<[Vector3, Quaternion]>;
};

export const config: Config = {
  room_id: "",
  user_id: "",
  scene: null,
  socket: null,
  channel: null,
  $room_stream: new Subject<{ event: string, payload: any; }>(),
  $channel_joined: new Subject<boolean>(),
  $room_entered: new Subject<boolean>(),
  $camera_moved: new Subject<[Vector3, Quaternion]>()
}

```


## Simple Obstacles

At this point we're able to draw something 3D on the screen.  We should have in mind a general concept of the experience we want to craft and generally work toward that direction.  

Here's an outline:

- Every room URL can host a different visual experience.  
- The experience has a starting point and ends when you reach an ending point.  
- There are walls and obstacles.

Sounds pretty familiar right?  Like a maze or maybe a simple escape room.  Let's get started with some obstacles in the room.

### Database Supplied Obstacles

The objects we are currently seeing in the 3D scene were hardcoded in `scene.ts`.  But we'd like the ability to customize each room with some different meshes so that each room looks unique.  Babylon.js has prebuilt functions for many primative objects such as sphere, box, plane, column, etc.  Additionally these objects can be scaled, positioned and rotated in the scene.  

### Design a Snapshot Payload

If we were able to send the front-end a "snapshot" of all items in our seen, it might look something like this:

```json
{
  "entity1": {"position": [...], "rotation": [...], "scaling": [...], "mesh_builder": ...},
  "entity2": {"position": [...], "rotation": [...], "scaling": [...], "mesh_builder": ...},
}
```

In the payload above, each key/value pair represents a "thing" and "it's data".  Each key is an entity_id (randomly generated id, and each value is a JSON object of components (data for the thing).  A component is just another key/value pair.  For example "position" is a component name with [1,2,3] as the component value.  Components are just data, and entities are just ids.  To make sense of the data we use Systems.  We already have a folder we have created for systems.  Each system listens for incoming messages and will react accordingly to change the scene.

There are lots of ways we could design the schema for a database to persist this data.  I'm opting for a simple single table for each component in a row.  That way if only one component is updated for an entity then only one row needs to change.  In the above example, "entity1" has 4 components so it would occupy 4 rows in the database.  Each of the 4 rows would share the same entity_id, as well as a room_id because entities are tied to a particular room.

### Create the Components Table

Let's create a database table to be able to store some meta data about simple background objects.  We can then query this table for any objects that are supposed to be in the room and then load them and create them in 3D instead of hardcoding them.  Execute this Phoenix generator command:

```bash
 mix phx.gen.schema Rooms.Component components room_id:references:rooms entity_id:uuid component_name:string component:map
```

This will create two files, a schema and a migration:

```bash
* creating lib/xr/rooms/component.ex
* creating priv/repo/migrations/20240105030950_create_components.exs
```
Open the migration file and add two indexes to the change function.  This will aid us when we want to query all entities that belong to a room_id, as well as ensure that no two components that have the same name can exist on the same entity (it wouldn't make sense for an entity to have two "position" components for example).  Also change the references on_delete to :delete_all.  This will make it so whenever we delete a room, all the entities/components will be deleted as well.

```elixir
defmodule Xr.Repo.Migrations.CreateComponents do
  use Ecto.Migration

  def change do
    create table(:components, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :entity_id, :uuid
      add :component_name, :string
      add :component, :map
      add :room_id, references(:rooms, on_delete: :delete_all, type: :binary_id)

      timestamps(type: :utc_datetime)
    end

    create index(:components, [:room_id, :entity_id])
    create index(:components, [:entity_id, :component_name], unique: true)
  end
end
```

Run `mix ecto.migrate` to run the migration and create the table.

### Add Functions To Create and Query Entities for a Room

Let's make ourselves a helper function to create an entity from a map:

```elixir
@doc """
Insert entity from a map.  Our entities table actually contains individual components so we'll loop through
the components map and insert an entity record for each pair.
"""
def create_entity(room_id, entity_id, components = %{}) do
  # loop through components
  for {component_name, component_value} <- components do
    %Xr.Rooms.Entity{
      room_id: room_id,
      entity_id: entity_id,
      component_name: component_name,
      component: %{component_name => component_value}
    }
    |> Xr.Repo.insert!()
  end
end
```

We'll also create some functions to retrieve the entities back from the database:

```elixir
 @doc """
  Get all components for a room, sorted by entity_id so all components for entities are next to each other
  """

  def components(room_id) do
    Repo.all(from e in Xr.Rooms.Entity, where: e.room_id == ^room_id, order_by: e.entity_id)
  end

  @doc """
  Get a map of entities and their components for a room
  """

  def entities(room_id) do
    components(room_id)
    |> components_to_map()
  end

  def components_to_map(components) when is_list(components) do
    components
    |> Enum.reduce(%{}, fn record, acc ->
      new_components =
        case acc[record.entity_id] do
          nil -> record.component
          _ -> Map.merge(acc[record.entity_id], record.component)
        end

      Map.put(acc, record.entity_id, new_components)
    end)
  end
```

To makes sure these functions work let's right a test.  Let's update the `room_test.exs` with the following:

```elixir
defmodule Xr.RoomsTest do
  use Xr.DataCase

  alias Xr.Rooms

  ...

  describe "entities" do
    alias Xr.Rooms.Room

    import Xr.RoomsFixtures

    test "create_entity/3 with valid data creates a entity" do
      room = room_fixture()

      Rooms.create_entity(room.id, Ecto.UUID.generate(), %{
        "mesh_builder" => "box",
        "position" => [1, 2, 3]
      })

      Rooms.create_entity(room.id, Ecto.UUID.generate(), %{
        "mesh_builder" => "floor",
        "position" => [4, 0, -1]
      })

      assert Rooms.entities(room.id) |> Map.keys() |> Enum.count() == 2
    end
  end
end

```

Run the test with `mix test`.  (I haven't been updating tests along the way during every change, if you get some broken tests, just remove them like I did.  They no longer test valid things.  If I have time I'll go back and change this book to modify the tests as we go along TDD style)

### Add Random Obstacles To A Room Upon Creation

Let's create a function that takes a room_id and adds some random sized boxes at random positions:

```elixir
  def generate_random_content(room_id) do
     # run this a few random times to create random entities
    for _ <- 1..Enum.random(5..20) do
      create_entity(room.id, Ecto.UUID.generate(), %{
        "mesh_builder" => ["box", create_random_box_args()],
        "position" => create_random_position(),
      })
    end
  end

  def create_random_position() do
    [Enum.random(-25..25), Enum.random(0..4), Enum.random(-25..25)]
  end

  def create_random_box_args() do
    %{
      "depth" => Enum.random(1..10),
      "height" => Enum.random(1..10),
      "width" => Enum.random(1..10)
    }
  end
```

Open up `room_controller.ex` and modify the `create` room function to look like the following:

```elixir
  def create(conn, %{"room" => room_params}) do
    case Rooms.create_room(room_params) do
      {:ok, room} ->
        Xr.Rooms.generate_random_content(room.id)

        conn
        |> put_flash(:info, "Room created successfully.")
        |> redirect(to: ~p"/rooms")

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, :new, changeset: changeset)
    end
  end
```

I added the call to `generate_random_content` as well as made the redirect go to the index instead of putting us in the room when the room is created, which is the behavior I prefer.


Reset all your data in your dev database using `mix ecto.reset`.  Run your server again and create a new room and this time some random objects should be created.  We can check in the iex terminal using:

```elixir
> Xr.Rooms.entities("453b6858-9403-4dd9-a58e-17d25737be84") # get your room_id from your browser's URL bar
%{
  "027c850f-13aa-440f-9865-5a65fea6ec70" => %{
    "color" => [18, 124, 84],
    "mesh_builder" => ["box", %{"depth" => 5, "height" => 6, "width" => 5}],
    "position" => [-2, 0, 0]
  },
  ...
  ...
```

### Push Snapshot to Client After Join

Now let's pass this data to the front-end via the room channel.  After we join the room let's push the entities map down to the client.  Open up `room_channel.ex` and modify the handler for `after_join`.

```elixir
  def handle_info(:after_join, socket) do
    entities = Xr.Rooms.entities(socket.assigns.room_id)
    push(socket, "snapshot", entities)
    {:noreply, socket}
  end
```

### Add Snapshot System in the Frontend

Now lets make a new system on the front-end to consume this message and draw the boxes.  Create a file at `assets/js/systems/snapshot.ts`:

```typescript
import { CreateBox } from "@babylonjs/core/Meshes/Builders";
import { config } from "../config";

const { scene, channel } = config;

channel.on("snapshot", (payload) => {
  // payload is an object of entities, let's go through every one of them
  Object.entries(payload).forEach(([key, value]) => {
    process_entity(key, value as any);
  });
});

const process_entity = (entity_id: string, components: object) => {
  // only react if the mesh_builder component is present in components
  if (components["mesh_builder"]) {
    const [mesh_type, mesh_args] = components["mesh_builder"];
    // currently only handling box type at the moment
    if (mesh_type === "box") {
      const box = CreateBox(entity_id, mesh_args, scene);
      if (components["position"]) {
        box.position.fromArray(components["position"]);
      }
    }
  }
};
```

We're basically just passing the arguments that the Babylon.js Meshbuilder CreateBox already takes and invoking it on the frontend.  

If you now visit your browser and create some different rooms you will see some random boxes spread about.  We have successfully created different content for each room and we're seeing the differences in the browser.

The boxes are pretty bland though.  Let's try adding some color.

### Add Color Using Materials

Open up `rooms.ex` and add a color component in our random box generator:

```elixir 
def generate_random_content(room_id) do
  # pick a random color
  color = create_random_color()
  # run this a few random times to create random entities
  for _ <- 1..Enum.random(5..20) do
    create_entity(room_id, Ecto.UUID.generate(), %{
      "mesh_builder" => ["box", create_random_box_args()],
      "position" => create_random_position(),
      "color" => shift_color(color)
    })
  end
end
```

Also define a function that can create a random color:

```elixir
def create_random_color() do
  for _ <- 1..3 do
    Enum.random(0..255)
  end
end

def shift_color(color) do
  # color is a list with 3 elements
  # pick one of the element positions
  position = Enum.random(0..2)
  # modify the value at that position
  offset = case Enum.at(color, position) + Enum.random(-50..50) do
    offset when offset < 0 -> 0
    offset when offset > 255 -> 255
    offset -> offset
  end

  List.replace_at(color, position, offset)
end
```

I pick one base random color for a room, then just color shift all the other colors for the boxes.  That way each room tends to have a similar hue rather than having every room look like confetti.

We'll listen to that component inside `snapshot.ts` and add a material for that color.

```typescript
const process_entity = (entity_id: string, components: object) => {
  // only react if the mesh_builder component is present in components
  if (components["mesh_builder"]) {
    const [mesh_type, mesh_args] = components["mesh_builder"];
    // currently only handling box type at the moment
    if (mesh_type === "box") {
      const box = CreateBox(entity_id, mesh_args, scene);
      if (components["position"]) {
        box.position.fromArray(components["position"]);
      }
      if (components["color"]) {
        let material = new StandardMaterial(components["color"], scene);
        material.alpha = 1;
        material.diffuseColor = new Color3(components["color"][0]/255, components["color"][1]/255, components["color"][2]/255); 
        box.material = material;
      }
    }
  }
};
```

Give it another test in the browser.  We now have some colorful random obstacles.

### Summary

In this chapter we finally rendered something 3D in our show room URL by incorporating Babylon.js.  We also organized our front-end code according to module systems and introduced a mechanism to share data between systems.  We made some simple but unique assets for each room by specifying a data schema based on entities and components.  We randomly generated the data for each room upon room creation and stored the data into a database table we created.  Finally we created a system on the front-end that would receive a snapshot of room data and render the data to the scene as multi-colored boxes.