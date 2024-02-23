
### Create Your Project Directory

Now that we have Elixir and Phoenix installed, as well as docker (for our database), we can now create a new Phoenix project.

This Phoenix project will serve as the home for all of our code.  

We'll use the mix phx.new generator to create a new project for us.  By default phoenix will come with a postgres database configuration.  I recommend setting the option for binary-id, which will make any table we generate use uuid for the id column instead of incrementing integers.  This makes ids for users and rooms random, which is good for making them hard to guess and hard for people to guess how many rooms and users you have in total, as well as making it easier in the future to copy records from one database shard to another shard because you don't have to worry about id conflicts.

The command below will create a project folder for us.  I named my project xr, but you can call it whatever you want.

```bash
 mix phx.new xr --binary-id
```

This will take a moment to run.  When it is done it will create a folder called `xr` for us that is our new project home.  It will also spit out some getting started instructions, but if we run `mix ecto.create` without having a database to connect to we'll get some errors.

Let's ignore the lengthly output for just a moment.  We'll need to make sure Phoenix has access to a Postgres database before we can proceed with the instructions.

### Create a Postgres Database Server

Immediately `cd` into the new project folder that the previous command just created and create a `docker-compose.yml` file so that we can connect to a postgres database.

Paste the following into a docker-compose.yml file in your new project's root directory:

```dockerfile
version: '3.8'
services:
  db:
    image: postgres:14.1-alpine
    restart: always
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    ports:
      - '5432:5432'
    volumes: 
      - db:/var/lib/postgresql/data
volumes:
  db:
    driver: local
```

(If you're not familiar with docker or docker-compose you might want to study up on it briefly.)

Assuming you have docker and docker-compose or docker desktop already installed, run `docker-compose up -d`.  This will download the postgres image from dockerhub and initialize it with the default user and password.  

Check that the database image container is running with `docker ps`, which should show you list of running containers.  Remember that your server has this database dependency.  If you later try to start your server and you get database connection errors, check that Docker Desktop is running and check that your container from docker-compose is running too.

Now you can run the rest of the project instructions:

```bash
mix ecto.create
```

This will create a development database (a logical database) within your docker postgres database container.  

Then start your server using `iex -S mix phx.server`

Remember this command.  You'll be using it a lot and I may not always spell it out.  I'll just say, start your server and try something in your browser.  

If you're on linux or (windows subsystem for linux) you may also get an error about needing `inotify-tools`, in which case follow the links in the error message to install that for live-reload.

### Test Phoenix is Up and Running

With our server running, we can navigate to our browser at http://localhost:4000 and see the Phoenix Welcome Page.

## Creating Rooms

Now that our server is running, let's make some additions so that we can host different meetings in meeting rooms.  So we want a URL path like http://localhost:4000/rooms/some-room-id

Phoenix gives us a generator for writing some CRUD endpoints and databaes migration for us.  We can use that as a starting point then remove any code that we don't need.  It's a great way to get started because we can see example code and patterns that we'll be able to study and copy.

### Run Generator to Create Rooms

Open a terminal from your projects root folder and execute this mix task to generate a context called Rooms, a module call Room for the schema and a database migration to create a table called rooms.  The room by default will have a binary id thanks to the option we used to create the Phoenix project and will have just a name and a description for now.

```bash
mix phx.gen.html Rooms Room rooms name:string description:string
```

### Add Room Routes

Go ahead and follow the instructions and paste the new lines into your lib/xr_web/router.ex.  It should look something like this:

```elixir
scope "/", XrWeb do
  pipe_through :browser

  get "/", PageController, :home

  # pasted     
  resources "/rooms", RoomController
end
```

If you type `mix phx.routes` you'll see a table of the usual Create, Read, Update, Delete (CRUD) routes for `room`.

```bash
mix phx.routes
  GET     /                                      XrWeb.PageController :home
  GET     /rooms                                 XrWeb.RoomController :index
  GET     /rooms/:id/edit                        XrWeb.RoomController :edit
  GET     /rooms/new                             XrWeb.RoomController :new
  GET     /rooms/:id                             XrWeb.RoomController :show
  POST    /rooms                                 XrWeb.RoomController :create
  PATCH   /rooms/:id                             XrWeb.RoomController :update
  PUT     /rooms/:id                             XrWeb.RoomController :update
  DELETE  /rooms/:id                             XrWeb.RoomController :delete
```

The path `/rooms` will show a list of rooms we can manage.  The path `/rooms/:id` will be used to jump into a particular room.

### Create Rooms Database Table

The generator also created a database migration file inside your `priv/repo/migrations` folder.

Open the migration that was created for us:

```elixir
defmodule Xr.Repo.Migrations.CreateRooms do
  use Ecto.Migration

  def change do
    create table(:rooms, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string
      add :description, :string

      timestamps(type: :utc_datetime)
    end
  end
end
```
Let's change `:binary_id` on the `:id` to `:string` so that we can use a shorter random string rather than a long UUID.

Let's also change, add `null: false` to name, so the database ensures name is always populated on a room.  And we can set a `default` for description to empty string, since it isn't required.

```elixir
  add :name, :string, null: false
  add :description, :string, default: ""
```

Everything else looks good.  As you can see this migration will create a new table for us called `rooms` with an id column, name and description columns as well as default timestamps of inserted_at and updated_at.  

Let's open up the schema file at: `lib/xr/rooms/room.ex` and modify to look like this:

```elixir
defmodule Xr.Rooms.Room do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :string, autogenerate: false}
  @foreign_key_type :string
  schema "rooms" do
    field :name, :string
    field :description, :string

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(room, attrs) do
    room
    |> cast(attrs, [:name, :description])
    |> validate_required([:name])
  end
end
```
We changed the `@primary_key` to use a `string` and set `autogenerate` to `false`.  We also remove `:description` from `validate_required`.

Go ahead and run the migration now:

```bash
mix ecto.migrate
```

### Create Random Id Generator


Instead of using UUID, which I decided was unnecessarily long.  Let's create a function that can generate random strings of any length.  Create a new file at `lib/xr/utils.ex` and paste the following:

```elixir
defmodule Xr.Utils do

  def random_string(length \\ 5) do
    for _ <- 1..length,
        into: "",
        do: <<Enum.random('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklkmnopqrstuvwxyz')>>
  end
end

```

This function will randomly sample from a list of characters ranging between 0-9, A-Z and a-z.  Altogther that is 10 + 26 + 26 = 62 symbols.  If the function makes a random string for a length of 5 symbols, that's 62^5 possible combinations or nearly a 1 in a billion chance of collision.  That should be plenty random enough for our uses.

### Use Random ID in the Create Rooms Function

Open up `lib/xr/rooms.ex` and modify the create_room function to set the random id.

```elixir
  def create_room(attrs \\ %{}) do
    %Room{id: Xr.Utils.random_string()}
      |> Room.changeset(attrs)
      |> Repo.insert()
  end
```

If you run your server and visit http://localhost:4000/rooms you should see a CRUD UI where you can add some rooms.  Go ahead and play with the UI.  Create a few rooms and try out all the CRUD abilities.  Pretty neat considering we got all this functionality without need to write much code.

### Return to Index After Room Create

One thing that I don't like is that after I create a room (or edit a room), we are immediately redirected to the room's `show` route.  I would like to remain on the index so that we can continue where we left off and are not immediately thrown into a room.  Additionally, if I hit my back button from within the room, I'm returned to the index.  We can make this change now.  Open up `room_controller.ex` and edit the `create` and `update` functions to redirect us back to the index route `~p"/rooms"`:

```elixir
    ...
      conn
      |> put_flash(:info, "Room created successfully.")
      |> redirect(to: ~p"/rooms")
    ...
```

### Replace the Default Phoenix Home Page

If you go to http://localhost:4000, you'll see that the homepage still shows the Phoenix default welcome page.  We don't need that anymore.  We can customize that page by first locating the path in the `router.ex` file.

This line `get "/", PageController, :home` specifies that the `PageController` module and `home` function is responsible for handling the "/" default path.  Inside that home function is a render function that specifies a `:home` template.

And here I'll just say that there is some handwavy Phoenix magic happening that hooks up a `home.html.heex` template to this controller by way of a `PageHTML`.  Open up `page_html.ex` and see a module containing this line: 

```elixir
embed_templates "page_html/*"
```
Look for the template located at `controllers/page_html/home.html.heex` and you'll find all the code that renders the current home page.

Suffice to say that for any new controllers that we add, we'll just follow this directory and file naming convention and it should all "just work".  Or we can use the Phoenix controller generators and they will generate this boiler plate for us.

Go ahead and replace the contents of `home.html.heex` with something simple like:

```html
<h1>Welcome to the XR Space</h1>
```

If you look at `http://localhost:4000` now, we see our homepage is now updated but it looks absolutely atrocious.  The H1 doesn't look bolded or centered, which would be the normal behavior even for an unstyled webpage since the browser adds some user-agent styling to basic elements.  The reason why we're not seeing it is because Phoenix now ships with tailwind by default, a css framework and it stripes out ALL default formatting for every element so even the `<h1>` tag will render as plain text only.

If we add this:

```html
<h1 class="text-3xl text-center p-4">
  Welcome to the XR Space
</h1>
```

Now it looks a little better.  

For now let's at least have a basic link on our homepage link over to our rooms index page so that we can pick a room and jump into it:

```elixir
<.link href={~p"/rooms"} class="underline text-blue-700 p-2">Rooms</.link>
```

That strange looking `<.link` thing looks like an HTML tag but it's actually a Phoenix live view component.  That just means that it's a function named `link` that handles various kinds of navigation for us including clever push-state transitions that don't actually reload the page.  We don't really need to use it for this simple page transition since we're just using href which is a full page reload.  The next funky bit is the href value.  That is using a special ~p sigil which will raise a warning (vscode should underline in yellow) if we link to a non-existant path.

### Remove the Default Heading

Once we navigate to the `/rooms` page, we still see the Phoenix default header at the top of the page.  This is defined in the layout files.  Let's change those too.  My version of Phoenix, 1.7, contains two layers of layout files: `app.html.heex` and `root.html.heex`

```bash
├── lib
│   ├── xr_web
│   │   ├── components
│   │   │   ├── core_components.ex
│   │   │   ├── layouts
│   │   │   │   ├── app.html.heex
│   │   │   │   └── root.html.heex
│   │   │   └── layouts.ex
```

We'll want to retain important parts of it so that flash messages still work, so don't delete that.  For now I'll replace `app.html.heex` with:

```elixir
<header class="px-4 sm:px-6 lg:px-8">
  <h1 class="text-center mt-2">The XR Space</h1>
</header>
<main class="px-4 py-20 sm:px-6 lg:px-8">
  <.flash_group flash={@flash} />
  <%= @inner_content %>
</main>
```

The `root.html.heex` looks fine for now.  It's job is to wrap all of the HTML and include the compiled javascript and css files.  We want to keep all that.  I just replaced the backup title suffix to say "XR Space" instead of "Phoenix".

### Customize EsBuild

There's one more big change I want to make to our Phoenix build system and that is regarding how javascript is bundled.  It's not strictly mandatory, but I recommended it to have more control.  By default, the EsBuild system that comes with Phoenix does not use any plugins, and I would specifically like to add a plugin that can do typescript type-checking.  That way we can switch all javascript to typescript for improved reliability.

Tip:

If I forget to mention it everytime, commands that start with `npm` should be run from the project's `assets` folder.  Commands that start with `mix` should be run from the project's root folder.

The following command will create a package.json file and a node_modules folder that contain packages that we'll need.

Depending on your version of node you might need to run `npm init` first.

```bash
npm install esbuild @jgoz/esbuild-plugin-typecheck @types/phoenix_live_view @types/phoenix @babylonjs/core @babylonjs/gui @babylonjs/materials @babylonjs/inspector --save-dev
```

```bash
npm install ../deps/phoenix ../deps/phoenix_html ../deps/phoenix_live_view --save
```

Next let's create a custom esbuild script and remove the default esbuild dependency that comes with Phoenix.  This build script does the same thing that Phoenix's Esbuild was doing for us, but we'll be able to customize it.

### Configure esbuild script

Add an `assets/build.js` file like this:
```javascript
const esbuild = require("esbuild");
const { typecheckPlugin } = require('@jgoz/esbuild-plugin-typecheck');

const args = process.argv.slice(2);
const watch = args.includes('--watch');
const deploy = args.includes('--deploy');

const loader = {
  // Add loaders for images/fonts/etc, e.g. { '.svg': 'file' }
};

const plugins = [
  // Add and configure plugins here
  typecheckPlugin(),
];

// Define esbuild options
let opts = {
  entryPoints: ["js/app.ts"],
  bundle: true,
  format: "esm",
  splitting: true,
  logLevel: "info",
  target: "es2017",
  outdir: "../priv/static/assets",
  external: ["*.css", "fonts/*", "images/*"],
  loader: loader,
  plugins: plugins,
};

if (deploy) {
  opts = {
    ...opts,
    minify: true,
  };
}

if (watch) {
  opts = {
    ...opts,
    sourcemap: "linked",
  };
  esbuild
    .context(opts)
    .then((ctx) => {
      ctx.watch();
    })
    .catch((_error) => {
      process.exit(1);
    });
} else {
  esbuild.build(opts);
}
```

### Remove default Phoenix Esbuild dependency

Modify config/dev.exs so that the script runs whenever you change files, replacing the existing :esbuild configuration under watchers:

```elixir
config :xr, HelloWeb.Endpoint,
  ...
  watchers: [
    node: ["build.js", "--watch", cd: Path.expand("../assets", __DIR__)]
  ],
  ...
```

Modify the `aliases` task in `mix.exs` to install npm packages during mix setup and use the new esbuild on mix assets.deploy.  You should end up with something like this:

```elixir
  defp aliases do
    [
      setup: ["deps.get", "ecto.setup", "assets.setup", "assets.build"],
      "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: ["ecto.create --quiet", "ecto.migrate --quiet", "test"],
      "assets.setup": ["tailwind.install --if-missing", "cmd --cd assets npm install"],
      "assets.build": ["tailwind default", "cmd --cd assets node build.js"],
      "assets.deploy": [
        "tailwind default --minify",
        "cmd --cd assets node build.js --deploy",
        "phx.digest"
      ]
    ]
  end
```
### Remove Esbuild Config

Remove the esbuild configuration from `config/config.exs`.  

### Remove EsBuild from mix.exs

Remove the esbuild dependency from `mix.exs`.  Look for `defp deps do` and remove the line that contains esbuild.

When you remove that line you also need to unlock the esbuild dependency so that it is also removed from the lock file:

```bash
mix deps.unlock esbuild
```

At this point we have successfully removed the Phoenix default esbuild mix dependency and rolled our own esbuild using node and npm.  

### Enable Bundle Code-Splitting

If you look at `build.js`, notice that the options will use the experimental code splitting ability recently added to esbuild.  The splitting option only supports "esm" format for now and therefore and we need to add `type="module"` to the script tag that brings in `app.js` in root layout or we'll get an error like "Cannot use import statement outside a module".  

Open up `root.html.heex` and modify the script tag to include `type="module"`

```html
<!-- add type="module" to the script tag >
<script defer phx-track-static type="module" src={~p"/assets/app.js"}>
```

### Replace app.js with app.ts

```typescript
// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";
// Establish Phoenix Socket and LiveView configuration.
import { Socket } from "phoenix";
import { LiveSocket } from "phoenix_live_view";
import topbar from "../vendor/topbar";

let csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content");

let liveSocket = new LiveSocket("/live", Socket, { params: { _csrf_token: csrfToken } }) as LiveSocket & Socket;

// Show progress bar on live navigation and form submits
topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" });
window.addEventListener("phx:page-loading-start", _info => topbar.show(300));
window.addEventListener("phx:page-loading-stop", _info => topbar.hide());

// connect if there are any LiveViews on the page
liveSocket.connect();

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
```

### Add tsconfig.json

Since we're switching to typescript, add this file `assets/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "es2016",
    "module": "ESNext",
    "moduleResolution": "node",
    "noResolve": false,
    "noImplicitAny": false,
    "sourceMap": true,
    "skipLibCheck": true,
    "preserveConstEnums":true,
    "lib": [
        "dom",
        "es2020"
    ]
  }
}
```

### Verify Asset Bundles

If you want to see the assets that our source typescript files turn into, start your dev server `iex -S mix phx.server` then take a look inside `priv/static/assets` folder.  The watchers are hard at work observing any changes to the typescript files and then esbuild is bundling and splitting the files here.  If these look very big during development keep in mind that we're not minifying any code in development.  To see what the file sizes will look like for production run `mix assets.deploy`.  This will create the minified, no sourcemap, gzipped versions of the files.  You can run `mix phx.digest.clean --all` to remove digest files created.


### Summary

In this chapter we've created our codebase working directory using the `mix phx.new` generator.  We then created a `rooms` resource by running `mix phx.gen.html` generator and built our rooms table.  The room will serve as our virtual meeting room.  We've removed the default Phoenix page headers and customized a bare bones header and homepage.  We swapped out the way Phoenix packages and bundles its javascript using a custom esbuild script so that we can lean on Typescript for our future front-end coding experience.  We replaced the entry point for our javascript `app.js` with `app.ts` so our code is fully typescript.  We enabled esbuild code-splitting option and modified the script tag in the Phoenix layout to use `type="module"` to support the feature.