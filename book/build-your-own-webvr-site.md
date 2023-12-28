# Build Your Own Immersive VR Enabled Website for Fun and Profit

## What this book is about

This book is a step-by-step guide to building a website that is also a platform for WebXR immersive experiences using Babylon.js (3D graphics in the browser), Elixir (serverside language/runtime that acts like an operating system), WebRTC (voice chat and video streams) and Phoenix Channels (other realtime communications).  I'll take you through the steps of starting a new project from the very first commit.  We'll gradually build capabilities up that you would expect in a VR immersive world such as seeing each other's avatar, hearing each other talk, being able to grab and throw things etc.  We'll build a basic first person shooter/escape room style game from first principles.  By the end of the book you'll be able to deploy your own website that folks can easily visit in any head-mounted-display (HMD) that ships with a web browser such as the Oculus Quest.

## Who is this book for?

I want to say this book is for everyone that wants to create their own VR enabled website.  Though... software developers that have some experience with full stack web development will probably have the easiest time following this guide.  

I assume that the reader is already comfortable with using command lines at a terminal and website concepts like HTML, CSS, and Databases.  It will be helpful to know how to use Git and Docker and some working knowledge of javascript/typescript and Elixir.  I don't spend much time explaining those fundamentals because there are plenty of resources for that already.  

Ultimately, web development of any kind is a messy business involving a long list of different technologies that even an experienced web developer has trouble wrangling.  But if you love building experiences and are good at Googling to learn, then let's get started!

## Why this particular set of technologies?

Indeed there are many ways to accomplish a goal and this is just one possible combination of libraries, languages and tools that bring forth web enabled VR.  I can almost hear the reader asking, "Why not use Node so that you can use javascript on the front-end and the back-end?  Why not use A-frame which is very easy to learn and has a community of plugins.  Why not Three.js?  Why should I learn Elixir and Phoenix?"

There is a lot I wanted to write about how my journey started with those other choices but I moved away from them for various reasons.  Suffice to say, your own mileage may vary, but this bullet list below is a small and incomplete commentary on different technologies that I have tried:

### A-frame
- Built on Three.js
- Incredibly approachable, friendly and easy to get started with, less so when you get into advanced behaviors.  
- Later on I felt it was an unnecessary abstraction using HTML custom elements
- For any advanced behavior you'll need to drop into Three.js anyway.
- Someone on a forum stated it best this way: "It makes easy what was already easy, and makes more complex things that are already complex"
- Mozilla Hubs started with A-frame and decided to move away from it.

### Three.js
- Large community, well known library.
- You can find lots of demos written in Three.js
- The demos were hard for me to build upon because Three.js breaks backward compatibility on each version.
- By extension, the promise of A-frame's library of components failed to live up to its promise for me because I couldn't get code to work together from different A-frame components because of version issues

### Babylon.js
- Does pretty much all the things Three.js can do but retains backward compatibility as a core tenant!
- Has a prototyping playground to share working code or troubleshoot with others
- Superb community that fixes bugs within 24 hours.
- Stitching together code from various playgrounds just works as expected.
- FrameVR chose Babylon.js for their immersive VR experience.
- Maintained actively by Microsoft employees.

### Node on the backend
- It does sound appealing to be able to reuse the same code between the frontend and backend
- Can use socket.io, express to serve up pages.  There are quite a few libraries, npm is a huge resource.
- There exists the potential to write a server in either Three.js or Babylon.js that has access to the same physics engine that can keep everything in sync on the clients.
- Depending on how important your physics state is, that may be something you want to do.
- If there is an unhandled bug, there is no room isolation.
- Etherial Engine uses this approach and the stack seems to involve Kubernetes and docker to deploy and scale your stack, which seems like overkill at first if you just want to launch a small private space.
- My feeling is, we should solve cheap small rooms first.  Make that an engaging experience on a single node that is easy to deploy, before worrying about massive scalability.  The reason people aren't coming isn't because we can't fit massive amounts of people.

### Phoenix/Elixir backend
- Elixir is a language/runtime that acts like a bunch of tiny processes (servers) that can communicate with each other, be distributed etc
- It has great patterns for supervision, resiliency, and changes the way I think about design.
- No code can be shared between the frontend and backend.
- Phoenix has Channels built into the framework as a way to build multiuser communications
- Phoenix has Liveview to build interactive and pages
- If one room goes down (crashes) it can be automatically restarted by a supervisor process, and won't impact any other room
- Mozilla Hubs uses Phoenix Channels and Elixir in their Reticulum Server
- X-Plane flight simulator uses Elixir in their backend


In summary, I like these tools because I think it positions us in an attractive place to be able to start small and iterate and has features that will allow us to scale horizontally later.

## Why not use off the shelf VR as a Service?

We now have a couple of companies that provide turn key solutions to hold meetings and classes in VR.  I've tried Mozilla Hubs and FrameVR that provide login mechanisms, different avatars and environments to choose from, tools like street view, laser pointers, white boarding etc.  Both of them seem to be doing well and continuing to add new features.  I would say, if you are an end-user looking for a VR platform, these might be great choices for you.  It would be like a merchant choosing Shopify instead of creating their own ecommerce website from scratch, which can save them a lot of effort in not rebuilding the same tooling.  

But there is also a certain amount of vendor lock-in you get when choosing a platform.  These platforms are also rather purpose built to hold Zoom/Skype like classes for students in VR.  There are plenty of built in menus for screen sharing, taking a screenshot, posting something to social media etc.  Plenty of built in functionality that you might not need or want.  You are also limited in how much you can customize an experience for your own visitors including the menus and login and management just outside of the VR experience.  Being able to build your own platform from the ground up will allow you to have complete control over your own customers and your own features.

I miss the days when making a website was simple.  All a developer needed was a server to host a webpage.  A text editor and an ftp client.  Web 1.0 days.  Then came dynamic webpages backed by databases.  Frameworks entered.  So did version control and testing and migrations.  Pretty soon the stakes got higher and so did the barrier to entry.  Web 2.0.  Now we have more realtime communications then ever with realtime messaging, notifications etc.  

Though if we take a step back it's not that bad... (ok it is bad), but it's still the accumulation of tools.  Tools that work for us, and we just need a little know how to figure out how to fit them together.  Fortunately other companies have packaged some of those tools into libraries like Babylon.js and frameworks like Phoenix, that make our job so much easier.

# Preparing your development workstation

If you're on Windows, I highly recommend you install the windows subsystem for linux.  That will give you a similar environment as production and make other activities a lot easier such as dockerizing, setting paths or environment variables.

If you're on Linux you're already good to go.  If you're on Mac you're fine too.  

## Install Elixir

To develop, we're going to want to install Elixir.  And to install Elixir, we need to also install Erlang.  I highly recommend you install these using asdf so that you can switch versions.  At some point in the future, you'll be working on several projects, or you may check out some old code you wrote a few months back and want to work on it again, only to find that your new computer that you bought has a different version of Elixir than the old project.

Read the asdf instructions for installing Erlang and Elixir, they'll have the latest instructions for your system.  When I tried to install the latest Erlang I had an error regarding wxWidgets and had to do some Googling: https://github.com/asdf-vm/asdf-erlang/issues/203 and had to install some other linux dependencies first.

If all goes well, you should be able to open up a terminal and check which version of elixir you have installed like this:

```bash
elixir -v
```

## Add a variable in your shell profile to preserve iex history.

We're going to be working in the iex terminal from time to time, and surprisingly the up arrow does not bring back the previous command history between iex sessions.  I find that so annoying that that is not the default.  Luckily we can add this to our shell startup script and that will fix that annoyance.

```bash
# Add to shell profile
export ERL_AFLAGS="-kernel shell_history enabled"
```

## Install docker and docker-compose.  

There are two reasons for wanting to use docker.  The first reason is so that we can run a local database with ease as we develop.  For Windows and Mac users the easiest way is probably by installing Docker Desktop for Windows (and mac) respectively.  The second reason for using docker is for when it comes time for deployment to production, creating a docker image might be one of the ways we'll want to utilize.


## Install vscode.

This is my recommended code editor.  You can install a different one if you prefer.

Install Elixir plugins for vscode

These help with syntax highlighting and code completion.  I recommend Googling for the latest recommended extensions and installing those.  

At the time of this writing I'm using:
- jakebecker.elixir-ls
- phoenixframework.phoenix
- bradlc.vscode-tailwindcss

## Install Phoenix

https://hexdocs.pm/phoenix/installation.html

```bash
mix local.hex
mix archive.install hex phx_new
```


## Create Your Project Directory
An empty Phoenix project will serve as the home for all of our code.  We'll start with a self-sufficient monolith, and only reach for other technologies when the need arises.

We'll use the mix phx.new generator to create a new project for us.  By default phoenix will come with a postgres database configuration.  I recommend setting the option for binary id, which will make any table we generate use uuid for the id column instead of incrementing integers.  This makes ids for users and rooms random, which is good for making them hard to guess and hard for people to guess how many rooms and users you have in total, as well as making it easier in the future to copy records from one database shard to another shard because you don't have to worry about id conflicts.

The command below will create a project folder for us.  I named my project xr, but you can call it whatever you want.

```bash
 mix phx.new xr --binary-id
```

Ignore the lengthly output for just a moment.  We'll need to create a database first.

## Create a Postgres Database Server

Docker is the easiest way to setup a hassle free and disposable database.  Getting the right drivers and dependences on your local machine and keeping them maintained when your OS needs to upgrade is a pain.  We don't really care where this data lives on our local machine, this is just a way for us to develop and test our features. 

Immediately after running the `mix phx.new` command, `cd` into the new project folder that it create and we'll create a docker-compose.yml file so that we can connect to a postgres database.

Paste the following into a docker-compose.yml file in your new project's root directory

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


Assuming you have docker and docker-compose or docker desktop already installed, run `docker-compose up -d` 

Check that the database image container is running with `docker ps`

Now you can run the rest of the project instructions:

 `mix ecto.create`

This will create a development database (a logical database) within your docker postgres database container.  

Then start your server using `iex -S mix phx.server`

If you're on linux you may also get an error about needing inotify-tools, in which case follow the links to install that for live-reload.

## Summary

If everything went well in this chapter then you should be able to visit http://localhost:4000 in your browser and see the default Phoenix welcome page.  We have all the tools we need to run a basic web site with a database on our local machine, we have our project home directory for all our files.  This would be a good point to make your first git commit.  Now that we have a humble starting point, in the next chapter we can start cranking on the next step.

# Creating rooms

In the last chapter we managed to setup a folder for our code and we can now load up the default Phoenix welcome page in a browser at http://localhost:4000.  Let's change that.  Let's make it so that we can host different meetings in meeting rooms.  So we want a URL path like http://localhost:4000/rooms/some-room-id

Phoenix gives us a generator for writing some CRUD endpoints and databaes migration for us.  We can use that as a starting point then remove any code that we don't need.  It's a great way to get started because we can see example code and patterns that we'll be able to study and copy.

Open a terminal from your projects root folder and execute this mix task to generate a context called Rooms, a module call Room for the schema and a database migration to create a table called rooms.  The room by default will have a binary id thanks to the option we used to create the Phoenix project and will have just a name and a description for now.

```bash
mix phx.gen.live Rooms Room rooms name:string description:string
```

Go ahead and follow the instructions and paste the new lines into your lib/xr_web/router.ex.  It should look something like this:

```elixir
scope "/", XrWeb do
  pipe_through :browser

  get "/", PageController, :home

  # pasted these new routes
  live "/rooms", RoomLive.Index, :index
  live "/rooms/new", RoomLive.Index, :new
  live "/rooms/:id/edit", RoomLive.Index, :edit

  live "/rooms/:id", RoomLive.Show, :show
  live "/rooms/:id/show/edit", RoomLive.Show, :edit
end
```

Note the usual paths created in your typical CRUDy style.  You'll goto `/rooms` to see a list of all your rooms and `/rooms/some-id` to drill down into a particular room. 

The generator also created a database migration file inside your `priv/repo/migrations` folder.

I always like to take a peek at the migration file before executing the `mix ecto.migrate` task so that I know what it will do.

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

Everything looks good.  As you can see this migration will create a new table for us called `rooms` with an id column, name and description columns as well as default timestamps of inserted_at and updated_at.  These are just following the framework conventions.

Go ahead and run the migration now:

```bash
mix ecto.migrate
```

If you run your server and visit http://localhost:4000/rooms you should see a CRUD UI where you can add some rooms.  Go ahead and add some and try out all the CRUD abilities.

## Replace the default Phoenix landing page

If you go to http://localhost:4000, you'll see that the homepage still shows the Phoenix default welcome page.  We don't need that anymore.  We can customize that page by first locating the path in the `router.ex` file.

This line `get "/", PageController, :home` specifies that the `PageController` module and `home` function is responsible for handling that path.  Inside that home function is a render function that specifies a `:home` template.

And here I'll just say that there is some handwavy Phoenix magic happening that delegates to a view module with the same prefix as our controller, `PageHTML`, that hooks up the ability to define page templates in a folder.  Open up page_html.ex and see this line: 

```elixir
embed_templates "page_html/*"
```
Look for the template located at `controllers/page_html/home.html.heex` and you'll find all the code that renders the current home page.

Suffice to say that for any new controllers that we add, we'll just follow this directory and file naming convention and it should all "just work".  Or we can use the Phoenix controller generators and they will generate this boiler plate for us.

Go ahead and replace the contents of home.html.heex with something simple like:

```html
<h1>Welcome to the XR Space</h1>
```

If you look at `http://localhost:4000` now, we see our homepage is now updated but it looks absolutely atrocious.  The H1 doesn't look bolded or centered, which would be the normal behavior even for an unstyled webpage since the browser adds some user-agent styling to basic elements.  The reason why we're not seeing it is because Phoenix now with tailwind by default, a css framework and it stripes out ALL default formatting for every element so even the `<h1>` tag will render as plain text only.

If we add this:

```html
<h1 class="text-3xl text-center p-4">
  Welcome to the XR Space
</h1>
```

Now it looks a little better.  I am not a CSS guru, but they say the utility classes that come with CSS help folk to learn CSS even better.  Whatevs, I'm hoping Google or ChatGPT or Codeium (vscode plugin for AI completion) can help me write tailwind.

For now let's at least have a basic link on our homepage link over to our rooms index page so that we can pick a room and jump into it:

```elixir
<.link href={~p"/rooms"} class="underline text-blue-700 p-2">Rooms</.link>
```

That strange looking `.link` thing looks like an HTML tag but it's actually a Phoenix live view component.  That just means that it's a function named `link` that handles various kinds of navigation for us including clever push-state transitions that don't actually reload the page.  We don't really need to use it for this simple page transition since we're just using href which is a full page reload.  The next funky bit is the href value.  That is using a special ~p sigil which will raise a warning (vscode should underline in yellow) if we link to a non-existant path.

## Remove the Default Heading

Once we navigate to the `/rooms` page, we still see the Phoenix default header at the top of the page.  This is defined in the layout files.  Let's change those too.  My version of Phoenix, 1.7, contains two layers of layout files: `app.html.heex` and `root.html.heex`

├── lib
│   ├── xr_web
│   │   ├── components
│   │   │   ├── core_components.ex
│   │   │   ├── layouts
│   │   │   │   ├── app.html.heex
│   │   │   │   └── root.html.heex
│   │   │   └── layouts.ex

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

## Enable Room Specific Communication

Now that we have a landing page for a particular room at `/rooms/some-room-id-randomly-generated` let's see if we can send a message from that room, and in another browser, if also connected to the same room, be able to receive that message.

We don't have much of a UI in our room yet, but don't worry we don't need it yet.  Let's just get the backend mechanics set up so we can send and receive messages.

Here's some basic concepts:

In javascript land we're going to connect to a web socket at an address hosted by the server.  When we connect to the socket we send some initial data from the front-end so the server can authenicate us (we wouldn't want just anybody to be able to connect to our server right?).  We're also going to join a channel which is "made" from the socket.  A channel is kind of a data/communication/connection abstraction built on top of the socket.  In fact, if we wanted to we could create multiple channels and all of them would be multiplexed over the same socket. A channel is basically an event machine.  It listens to messages directed at it, and then runs some code to update its state and either reply or maybe not reply.  The javascript side is nearly a mirror of this setup.  The javascript client joins a channel and can subscribe or listen to messages that come from the server and also push messages to the channel, so it's a two way street.

### Sharing the liveview socket

It turns out that liveview, the same technology that is rendering the HTML for our modal that was just generated when we created the rooms Liveview CRUD pages, already comes with a web socket to send little diffs to the front-end to render components without re-rendering the whole page.

Look inside `assets/js/app.js`

```javascript
let liveSocket = new LiveSocket("/live", Socket, {params: {_csrf_token: csrfToken}})

```

app.js created a LiveSocket.  The "/live" part references this endpoint defined in `endpoint.ex`

```elixir
socket "/live", Phoenix.LiveView.Socket, websocket: [connect_info: [session: @session_options]]

```

We can reuse this endpoint so that our front-end javascript code does not need to create an additional web socket.


<!--
 All channels will have their message multiplexed over the socket.

 this.socket.connect();

    // Now that you are connected, you can join channels with a topic.
    // Let's assume you have a channel with a topic named `room` and the
    // subtopic is its id - in this case 42:
    this.channel = this.socket.channel("space:" + this.xrs.config.space_id, {});

-->

Let's define a user socket which we'll use to authenticate and also define which channels can be multiplexed over the user socket.


```elixir
defmodule XrWeb.UserSocket do
  # use Phoenix.Socket
  use Phoenix.LiveView.Socket

  require Logger
  # A Socket handler
  #
  # It's possible to control the websocket connection and
  # assign values that can be a ccessed by your channel topics.

  ## Channels

  channel "room:*", XrWeb.RoomChannel

  # Socket params are passed from the client and can
  # be used to verify and authenticate a user. After
  # verification, you can put default assigns into
  # the socket that will be set for all channels, ie
  #
  #     {:ok, assign(socket, :user_id, verified_user_id)}
  #
  # To deny connection, return `:error`.
  #
  # See `Phoenix.Token` documentation for examples in
  # performing token verification on connect.
  @impl true
  def connect(%{"_member_token" => token}, socket, _connect_info) do
    case Phoenix.Token.verify(socket, "salt", token, max_age: 1_209_600) do
      {:ok, member_id} ->
        {:ok, assign(socket, member_id: member_id)}

      {:error, reason} ->
        Logger.error("#{__MODULE__} connect error #{inspect(reason)}")
        :error
    end
  end

  # Socket id's are topics that allow you to identify all sockets for a given user:
  #
  #     def id(socket), do: "user_socket:#{socket.assigns.user_id}"
  #
  # Would allow you to broadcast a "disconnect" event and terminate
  # all active sockets and channels for a given user:
  #
  #     Elixir.ThexrWeb.Endpoint.broadcast("user_socket:#{user.id}", "disconnect", %{})
  #
  # Returning `nil` makes this socket anonymous.
  @impl true
  def id(_socket), do: nil
end
```




Define our room channel

defmodule ThexrWeb.SpaceChannel do
  use ThexrWeb, :channel
  alias ThexrWeb.Presence

  @impl true
  def join("space:" <> space_id, _payload, socket) do
    send(self(), :after_join)
    {:ok, %{"agora_app_id" => System.get_env("AGORA_APP_ID")}, assign(socket, space_id: space_id)}
  end

  # Channels can be used in a request/response fashion
  # by sending replies to requests from the client
  @impl true
  def handle_in("imoved", payload, socket) do
    ThexrWeb.Space.Manager.process_event(
      socket.assigns.manager_pid,
      %{
        "eid" => socket.assigns.member_id,
        "set" => %{"avatar_pose" => payload},
        "tag" => "m"
      },
      self()
    )

    # TODO, cache this in ETS, and then broadcast at some desired interval

    # broadcast_from(socket, "stoc", %{eid: socket.assigns.member_id, set: %{avatar_pos: payload}})
    # add_location_to_ets(socket, payload)
    {:noreply, socket}
  end

  def handle_in("ctos", payload, socket) do
    ThexrWeb.Space.Manager.process_event(socket.assigns.space_id, payload, self())
    {:noreply, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    case Thexr.Registry.whereis(:manager, socket.assigns.space_id) do
      nil ->
        # in dev if server rebooted and open tab reconnects, we should get redirected
        push(socket, "server_lost", %{})
        {:noreply, socket}

      manager_pid ->
        {:ok, _} =
          Presence.track(socket, socket.assigns.member_id, %{
            online_at: inspect(System.system_time(:second))
          })

        # push(socket, "presence_state", Presence.list(socket))
        socket = assign(socket, :manager_pid, manager_pid)

        Process.send_after(self(), :send_initial_state, 10)
        {:noreply, socket}
    end
  end

  # avoid race condition between presence track and get_members
  def handle_info(:send_initial_state, socket) do
    push(
      socket,
      "existing_members",
      ThexrWeb.Space.Manager.get_members(socket.assigns.manager_pid)
    )

    push(socket, "snapshot", ThexrWeb.Space.Manager.get_snapshot(socket.assigns.space_id))

    # test to see if we receive some kind of message when the genserver timesout
    Process.monitor(socket.assigns.manager_pid)
    {:noreply, socket}
  end

  # the moniter

  def handle_info(
        {:DOWN, _ref, :process, _pid, :shutdown},
        socket
      ) do
    push(socket, "server_lost", %{})

    {:stop, "server_timeout", socket}
  end

  def handle_info(
        {:DOWN, _ref, :process, _pid, _reason},
        socket
      ) do
    # ignore other kinds of crashes, supervisor will bring it back up
    {:noreply, socket}
  end

  @impl true
  def terminate(_reason, socket) do
    # tell the server the channel is disconnected
    # SpaceServer.process_event(
    #   socket.assigns.space_id,
    #   %{
    #     "eid" => socket.assigns.member_id,
    #     "ttl" => 0
    #   },
    #   self()
    # )

    push(socket, "server_lost", %{})
    {:noreply, socket}
  end

  # def add_location_to_ets(socket, payload) do
  #   :ets.insert(socket.assigns.ets_ref, {socket.assigns.member_id, payload})
  # end

  # def lookup_member_poses(socket) do
  #   :ets.tab2list(socket.assigns.ets_ref)
  #   |> Enum.reduce(%{}, fn {member_id, payload}, acc ->
  #     Map.put(acc, member_id, payload)
  #   end)
  # end
end





In the endpoint.ex add:

 socket "/live", ThexrWeb.UserSocket, websocket: [connect_info: [session: @session_options]]

Our first interaction between two players in the same room/experience will be to share their physical location and draw a simple box representing each other.  When one player moves around with their cursor keys, the other player should be able to see that other player's box moving around.

Adding Phoenix Presence

Our First 3D Scene

Now that we have landing page for entering into an experience, let's show the user at least one 3D object.  We will lay the foundation for all of our front end graphics and we will continue to build from there.

Configuring Esbuild

Phoenix comes with a wrapped version of esbuild with some tucked away defaults.  We're going to want to remove that so that we can customize our esbuild configuration.  That way we can load dependencies with package.json and import them into our own typescript code, and then we'll want to ignore some external dependencies so that they aren't bundled into our javascript artifact.  I prefer to download Babylon.js from their CDN.  These libraries don't change as often as our own code and therefore in prod, when we push out changes only our javascript changes would be downloaded and the user would likely already have a cached version of the CDN.

Esbuild will by default produce a bundle of javascript that is a single file wrapped in an immediately invoked function expression so that its internal variables cannot be accessed from the world outside.  Since we'll have other pages that do not need to contain code pertaining to 3D and Babylon, we can create two bundles.  One for immersive VR, and one for everything else.

Creating two esbuild targets


Creating two Phoenix Layouts

We'll also create two Phoenix layouts.  One to hold all the cdns of babylonjs dependencies as well as the alternate esbuild bundle.  And one for our lightweight version of our bundle.

Create the engine

Create the camera

Create the lighting

Create the scene

Create a box




Creating a sticky unique id per visitor
We'll defer creating a full fledged login system until later.  But for now, we need a way to tracking


