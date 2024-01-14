# Build Your Own Immersive VR Enabled Website for Fun and Profit

- [Build Your Own Immersive VR Enabled Website for Fun and Profit](#build-your-own-immersive-vr-enabled-website-for-fun-and-profit)
  - [What this book is about](#what-this-book-is-about)
    - [Who is this book for?](#who-is-this-book-for)
    - [Why this particular set of technologies?](#why-this-particular-set-of-technologies)
      - [A-frame](#a-frame)
      - [Three.js](#threejs)
      - [Babylon.js](#babylonjs)
      - [Node on the backend](#node-on-the-backend)
      - [Phoenix/Elixir backend](#phoenixelixir-backend)
    - [Why not Unity?](#why-not-unity)
    - [Why not use off the shelf WebVR Services?](#why-not-use-off-the-shelf-webvr-services)
  - [Preparing your development workstation](#preparing-your-development-workstation)
    - [Install Elixir](#install-elixir)
    - [Preserve iex history.](#preserve-iex-history)
    - [Install docker and docker-compose.](#install-docker-and-docker-compose)
    - [Install vscode.](#install-vscode)
    - [Install Phoenix](#install-phoenix)
    - [Create Your Project Directory](#create-your-project-directory)
    - [Create a Postgres Database Server](#create-a-postgres-database-server)
    - [Workstation Ready](#workstation-ready)
  - [Creating Rooms](#creating-rooms)
    - [Run Generator to Create Rooms](#run-generator-to-create-rooms)
    - [Add Room Routes](#add-room-routes)
    - [Create Rooms Database Table](#create-rooms-database-table)
    - [Replace the Default Phoenix Home Page](#replace-the-default-phoenix-home-page)
    - [Remove the Default Heading](#remove-the-default-heading)
  - [Meeting Room Communications](#meeting-room-communications)
    - [Basic Socket Channel Concepts:](#basic-socket-channel-concepts)
    - [Create a User Socket](#create-a-user-socket)
    - [Create a Room Channel](#create-a-room-channel)
    - [Let UserSocket Know About RoomChannel](#let-usersocket-know-about-roomchannel)
    - [Modify RoomChannel Join function](#modify-roomchannel-join-function)
    - [Sharing the liveview socket](#sharing-the-liveview-socket)
    - [Join the Room Channel](#join-the-room-channel)
    - [Send and Receive a Test Message](#send-and-receive-a-test-message)
  - [Securing the WebSocket](#securing-the-websocket)
    - [Creating a unique id per visitor](#creating-a-unique-id-per-visitor)
    - [Add User Token to Conn](#add-user-token-to-conn)
    - [Add User Token to Frontend](#add-user-token-to-frontend)
    - [Add User Token to Client Side Socket Connection Code](#add-user-token-to-client-side-socket-connection-code)
    - [Verify User Token in Server side Socket Connect Callback](#verify-user-token-in-server-side-socket-connect-callback)
    - [Verify RoomChannel Gets UserId](#verify-roomchannel-gets-userid)
  - [Adding Babylon.js](#adding-babylonjs)
    - [Install node](#install-node)
    - [Configure esbuild script](#configure-esbuild-script)
    - [Remove default Phoenix Esbuild dependency](#remove-default-phoenix-esbuild-dependency)
    - [Add tsconfig.json](#add-tsconfigjson)
    - [Restructuring for Systems](#restructuring-for-systems)
      - [Add config.ts](#add-configts)
      - [Add broker.ts](#add-brokerts)
      - [Add scene.ts](#add-scenets)
      - [Add room.ts](#add-roomts)
    - [Replace app.js with app.ts](#replace-appjs-with-appts)
    - [Verify Asset Bundles](#verify-asset-bundles)
    - [Babylon Added Summary](#babylon-added-summary)
  - [Simple Obstacles](#simple-obstacles)
    - [Database Supplied Obstacles](#database-supplied-obstacles)
    - [Design a Snapshot Payload](#design-a-snapshot-payload)
    - [Create the Components Table](#create-the-components-table)
    - [Add Functions To Create and Query Entities for a Room](#add-functions-to-create-and-query-entities-for-a-room)
    - [Add Random Obstacles To A Room Upon Creation](#add-random-obstacles-to-a-room-upon-creation)
    - [Push Snapshot to Client After Join](#push-snapshot-to-client-after-join)
    - [Add some color](#add-some-color)
  - [Event Driven Architecture](#event-driven-architecture)
    - [Event Sourcing](#event-sourcing)
    - [Message Producers](#message-producers)
    - [Phoenix PubSub](#phoenix-pubsub)
  - [Presence](#presence)
    - [Phoenix Presence](#phoenix-presence)
  - [Ask for User First Interaction](#ask-for-user-first-interaction)
    - [LiveView Module](#liveview-module)
    - [LiveView Template](#liveview-template)
    - [LiveView JS Interop](#liveview-js-interop)
    - [Summary](#summary)
  - [Entering the Room at a Spawn Point](#entering-the-room-at-a-spawn-point)
    - [Create Spawn Point Entity](#create-spawn-point-entity)
    - [Create a Memory Store for User State](#create-a-memory-store-for-user-state)
    - [Add Handlers To Receive Movement Data](#add-handlers-to-receive-movement-data)
      - [Server Tells User Where They Should Be](#server-tells-user-where-they-should-be)
    - [Add Query Entities by Component Name](#add-query-entities-by-component-name)
  - [Designing Events and Messages](#designing-events-and-messages)
    - [Event Sourcing](#event-sourcing-1)
    - [Phoenix PubSub](#phoenix-pubsub-1)
    - [Create an Event Sink Server](#create-an-event-sink-server)
    - [First Person Shooter Events](#first-person-shooter-events)
    - [CRUD Events vs High Level Events](#crud-events-vs-high-level-events)
    - [Create ETS Table for User Snapshot](#create-ets-table-for-user-snapshot)
    - [](#)
    - [Simple Presence](#simple-presence)
    - [Event Sourcing](#event-sourcing-2)
    - [Client vs Server Dictates Position?](#client-vs-server-dictates-position)
    - [Phoenix Presence handle\_metas Callback](#phoenix-presence-handle_metas-callback)
    - [Add avatar.ts](#add-avatarts)
    - [Users Snapshot](#users-snapshot)
    - [Testing Multiplayer Without Deploying](#testing-multiplayer-without-deploying)
  - [Assets, Interactables, Non-player Related Items](#assets-interactables-non-player-related-items)
  - [Persistence of Scene State](#persistence-of-scene-state)
  - [Adding WebRTC](#adding-webrtc)
    - [Adding Agora](#adding-agora)
    - [Spatial Voice Audio](#spatial-voice-audio)
  - [Enabling Immersive VR Mode](#enabling-immersive-vr-mode)
    - [Sharing Hand Movement](#sharing-hand-movement)
    - [Grab and Throw objects](#grab-and-throw-objects)
  - [Making VR GUIs](#making-vr-guis)
  - [Deployment](#deployment)
  - [Optimizations](#optimizations)
    - [Truncate precision in position and rotation](#truncate-precision-in-position-and-rotation)
    - [Eliminate duplicate or nearly identical position or rotation messages](#eliminate-duplicate-or-nearly-identical-position-or-rotation-messages)
    - [Batch send all messages every 200 ms.](#batch-send-all-messages-every-200-ms)
    - [Group all movement data from the server into 200 ms batches.](#group-all-movement-data-from-the-server-into-200-ms-batches)
    - [Shorten the UUIDs in room and user](#shorten-the-uuids-in-room-and-user)
    - [Use pids instead of registry](#use-pids-instead-of-registry)
  - [Scaling](#scaling)
    - [Replacing Registry with Syn](#replacing-registry-with-syn)


## What this book is about

This book is a step-by-step guide to building a website that is also a platform for VR immersive experiences using Babylon.js (3D graphics in the browser), Elixir (serverside language/runtime that acts like an operating system), WebRTC (voice chat and video streams) and Phoenix Channels (other realtime communications).  I'll take you through the steps of starting a new project from the very first commit.  We'll gradually build capabilities up that you would expect in a VR immersive world such as seeing each other's avatar, hearing each other talk, being able to grab and throw things etc.  I'll be building something specific for my platform, but hopefully it gives you some ideas for building your own worlds.  Or give you a deep understanding of this particular stack so that you can contribute back to my open-source project.  By the end of the book you'll be able to deploy your own website that folks can easily visit in any head-mounted-display (HMD) that ships with a web browser such as the Oculus Quest.

### Who is this book for?

I wish I could say this book is for everyone that wants to create their own VR enabled website.  Though... software developers that have some experience with full stack web development will probably have the easiest time following this guide.  

I assume that the reader is already comfortable with using command lines at a terminal and website concepts like HTML, CSS, and Databases.  It will be helpful to know how to use Git and Docker and some working knowledge of javascript/typescript, Elixir and Phoenix.  I don't spend much time explaining those fundamentals because there are plenty of resources for that already.  Sometimes I explain a little more than I need to, but most times I don't otherwise this guide would be too long.  

Ultimately, web development of any kind is a messy business involving a long list of different technologies that even  experienced web developers have trouble wrangling.  We all need to Google, all the time.  Like constantly.  But if you love building experiences and are good at pushing through to learn, then let's get started!

### Why this particular set of technologies?

Indeed there are many ways to accomplish a goal and this is just one possible combination of libraries, languages and tools that bring forth web enabled VR.  I can almost hear the reader asking, "Why not use Node so that you can use javascript on the front-end and the back-end?  Why not use A-frame which is very easy to learn and has a community of plugins.  Why not Three.js?  Why should I learn Elixir and Phoenix?"

There is a lot more I wanted to write about how my journey started with those other choices and how my experience caused me to search for alternatives, but I don't want to rant too much so I'll keep it short.  Especially since it might be my own shortcomings as a programmer that caused me to hit a wall with those other solutions.  Suffice to say, your own mileage may vary, but this bullet list below is a small and incomplete commentary on different technologies that I passed through:

#### A-frame
- Built on Three.js
- Incredibly approachable, friendly and easy to get started with.
- Great introduction to Entity Component Systems (ECS).
- Later on I felt it was an unnecessary abstraction using HTML custom elements
- For any advanced behavior you'll need to drop into Three.js anyway.
- Someone on a forum stated it best this way: "It makes easy what was already easy, and makes more complex things that are already complex".
- Mozilla Hubs started with A-frame and decided to move away from it.

#### Three.js
- Large community, well known library.
- You can find lots of demos written in Three.js
- The demos were hard for me to build upon because Three.js breaks backward compatibility on each version.
- By extension, the promise of A-frame's library of components failed to live up to its promise for me because I couldn't get code to work together from different A-frame components because of version issues

#### Babylon.js
- Does pretty much all the things Three.js can do, but (and it's a huge deal) retains backward compatibility as a core tenant!
- Has a prototyping playground to share working code or troubleshoot with others
- Superb community that fixes bugs within 24 hours.
- Stitching together code from various playgrounds just works as expected.
- FrameVR chose Babylon.js for their immersive VR experience.
- Maintained actively by Microsoft employees.

#### Node on the backend
- Appealing to be able to reuse the same code between the frontend and backend
- Can use socket.io, express to serve up pages.  There are quite a few libraries, npm is a huge resource, but didn't find the same Phoenix like framework available.
- There exists the potential to write a server in either Three.js or Babylon.js that has access to the same physics engine that can operate as a server-side source of truth.
- I didn't explore this option more, because Phoenix provided a good enough framework for client heavy rendering and just using the server to bounce messages.  It's entirely possible that writing the server-side engine in Three.js or Babylon.js and then syncing the scene differences to the client could be another fruitful alternative approach.  

#### Phoenix/Elixir backend
- Elixir is a language/runtime that acts like a bunch of tiny processes (servers) that can communicate with each other, be distributed etc
- It has great patterns for supervision, resiliency, and changes the way I think about design.
- No code can be shared between the frontend and backend.
- Phoenix has Channels built into the framework as a way to build multiuser communications.
- Phoenix has Liveview to build interactive and pages.
- If one room goes down (crashes) it can be automatically restarted by a supervisor process, and won't impact any other room
- Mozilla Hubs uses Phoenix Channels and Elixir in their Reticulum Server.
- X-Plane flight simulator uses Elixir in their backend.


In summary, I chose particular tools because I think these selections positions the project in an attractive place to be able to start small and iterate yet has enough features that will allow us to scale horizontally later.

### Why not Unity?

While Unity has an HTML5 export which can target the browser, it has certain strengths and weaknesses.  Unity compiles it's code to run in the browser as a stand-alone artifact, so changes are you aren't developing in the browser most of the time, nor will you be calling the browser's APIs which would normally be readily available to you as a web developer.  

However, if you are already a Unity developer than you will feel right at home using the Unity IDE and therefore exporting a new build target should be easy and makes a lot of sense.  You'll also be able to take advantage of a lot of pre-built tooling, workflows, asset store, etc.  

The most powerful distinction I think I can make is that web native tech like Three.js or Babylon.js was made for the web to start with so you can freely intermingle regular web development-y code along side WebXR.  The web is already interconnected computers and networks.  In native website, jumping to another world is simply clicking on a link.  Web native sites are a webpage first, and a game second.  Unity is a game first, and a webpage second.

### Why not use off the shelf WebVR Services?


We now have a couple of companies that provide turn key solutions to hold meetings and classes in VR.  I've tried Mozilla Hubs and FrameVR that provide login mechanisms, different avatars and environments to choose from, tools like street view, laser pointers, white boarding etc.  Both of them seem to be doing well and continuing to add new features.  I would say, if you are an end-user looking for a VR platform to hang out with friends, host an event, teach a lecture, play a game etc, these might be great choices for you.  It would be like a merchant choosing Shopify instead of creating their own ecommerce website from scratch, which can save them a lot of effort in not rebuilding the same tooling.  

But there is also a certain amount of vendor lock-in you get when choosing a platform and you have to agree to their terms and conditions.  These platforms are also rather purpose built to hold Zoom/Skype like classes for students in VR.  There are plenty of built in menus for screen sharing, taking a screenshot, posting something to social media etc.  Plenty of built in functionality that you might not need or want.  You are also limited in how much you can customize an experience for your own visitors including the menus and login and management just outside of the VR experience.  Being able to build your own platform from the ground up will allow you to have complete control over your own customers and your own features.


## Preparing your development workstation

If you're on Windows, I highly recommend you install the windows subsystem for linux.  That will give you a similar environment as production and make other activities a lot easier such as dockerizing, setting paths or environment variables.

If you're on Linux you're already good to go.  If you're on Mac you're fine too.  

### Install Elixir

To develop, we're going to want to install Elixir.  And to install Elixir, we need to also install Erlang.  You can follow the Elixir online docs for how to install Elixir for your operating system, though I highly recommend you install these using asdf so that you can switch versions.  At some point in the future, you'll be working on several projects, or you may check out some old code you wrote a few months back and want to work on it again, only to find that your new computer that you bought has a different version of Elixir than the old project.

Read the asdf instructions for installing Erlang and Elixir, they'll have the latest instructions for your system.  When I tried to install the latest Erlang I had an error regarding wxWidgets and had to do some Googling: https://github.com/asdf-vm/asdf-erlang/issues/203 and had to install some other linux dependencies first.

If all goes well, you should be able to open up a terminal and check which version of elixir you have installed like this:

```bash
erl -s erlang halt
Erlang/OTP 26 [erts-14.2] [source] [64-bit] [smp:32:32] [ds:32:32:10] [async-threads:1] [jit:ns]

elixir -v
Erlang/OTP 26 [erts-14.2] [source] [64-bit] [smp:32:32] [ds:32:32:10] [async-threads:1] [jit:ns]

Elixir 1.15.7 (compiled with Erlang/OTP 26)
```

### Preserve iex history.

We're going to be working in the iex terminal from time to time, and surprisingly the up arrow does not bring back the previous command history between iex sessions.  I find that so annoying that that is not the default.  Luckily we can add this to our shell startup script and that will fix that annoyance.

```bash
# Add to shell profile
export ERL_AFLAGS="-kernel shell_history enabled"
```

### Install docker and docker-compose.  

You can skip this step if you already have Postgres on your machine.  But even if you do I recommend installing Docker anyway.  There are two reasons for wanting to use docker.  The first reason is so that we can run a local database with ease as we develop without worrying about version collisions or configuration conflicts with our host machine.  

For Windows and Mac users the easiest way is probably by installing Docker Desktop for Windows (and mac) respectively.  The second reason for using docker is for when it comes time for deployment to production, creating a docker image might be one of the ways we'll want to utilize for deployment, so familiarity with docker is helpful.  

Please lookup the instructions for installing docker and docker-compose on your system.  I'm using Windows and Windows Sub-System for Linux (WSL).  When I install Docker Desktop for Windows it automatically comes with docker-compose and docker is automatically available to me in the WSL command line environment as well.

We will be using Docker to run our local database.  Remember to have the docker server running, otherwise the server can't find the database.


### Install vscode.

This is my recommended code editor.  You can install a different one if you prefer.

Install Elixir plugins for vscode

These help with syntax highlighting and code completion.  I recommend Googling for the latest recommended extensions and installing those.  

At the time of this writing I'm using:
- jakebecker.elixir-ls
- phoenixframework.phoenix
- bradlc.vscode-tailwindcss

### Install Phoenix

https://hexdocs.pm/phoenix/installation.html

```bash
mix local.hex
mix archive.install hex phx_new
```
I'm using Phoenix 1.7.10.  You should use the same versions as I am using if you want to follow along.  I assume the code generators will produce the same code for you as it does for me.

### Create Your Project Directory
An empty Phoenix project will serve as the home for all of our code.  We'll start with a self-sufficient monolith, and only reach for other technologies when the need arises.

We'll use the mix phx.new generator to create a new project for us.  By default phoenix will come with a postgres database configuration.  I recommend setting the option for binary id, which will make any table we generate use uuid for the id column instead of incrementing integers.  This makes ids for users and rooms random, which is good for making them hard to guess and hard for people to guess how many rooms and users you have in total, as well as making it easier in the future to copy records from one database shard to another shard because you don't have to worry about id conflicts.

The command below will create a project folder for us.  I named my project xr, but you can call it whatever you want.

```bash
 mix phx.new xr --binary-id
```

Ignore the lengthly output for just a moment.  We'll need to make sure Phoenix has access to a Postgres database before we can proceed with the instructions it output.

### Create a Postgres Database Server

Immediately `cd` into the new project folder that the previous command just created and create a docker-compose.yml file so that we can connect to a postgres database.

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


Assuming you have docker and docker-compose or docker desktop already installed, run `docker-compose up -d`.  This will download the postgres image from dockerhub and initialize it with the default user and password.  

Check that the database image container is running with `docker ps`, which should show you list of running containers.  Remember that your server has this database dependency.  If you later try to start your server and you get database connection errors, check that Docker Desktop is running and check that your container from docker-compose is running too.

Now you can run the rest of the project instructions:

```bash
mix ecto.create
```

This will create a development database (a logical database) within your docker postgres database container.  

Then start your server using `iex -S mix phx.server`

Remember this command.  You'll be using it a lot and I may not always spell it out.  I'll just say, start your server and try something in your browser.  

If you're on linux you may also get an error about needing `inotify-tools`, in which case follow the links to install that for live-reload.

### Workstation Ready

If everything went well in this chapter then you should be able to visit http://localhost:4000 in your browser and see the default Phoenix welcome page.  We have all the tools we need to run a basic web site with a database on our local machine, we have our project home directory for all our files.  This would be a good point to make your first git commit.  Now that we have a humble starting point, in the next chapter we can start cranking on the next step.

## Creating Rooms

In the last chapter we managed to setup a folder for our code and we can now load up the default Phoenix welcome page in a browser at http://localhost:4000.  Let's change that.  Let's make it so that we can host different meetings in meeting rooms.  So we want a URL path like http://localhost:4000/rooms/some-room-id

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

Everything looks good.  As you can see this migration will create a new table for us called `rooms` with an id column, name and description columns as well as default timestamps of inserted_at and updated_at.  

Go ahead and run the migration now:

```bash
mix ecto.migrate
```

If you run your server and visit http://localhost:4000/rooms you should see a CRUD UI where you can add some rooms.  Go ahead and create a few rooms and try out all the CRUD abilities.  Pretty neat considering we got all this functionality without need to write much code.

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

## Meeting Room Communications

Now that we have a page for a particular room at `/rooms/some-room-id-randomly-generated` let's see if we can send messages back and forth between another browser connected to the same room URL.

We don't have much of a UI in our room yet, but don't worry we don't need it yet.  Let's just get the backend mechanics set up so we can send and receive messages.

### Basic Socket Channel Concepts:

In javascript land we're going to connect to a web socket at an address hosted by the server.  

```
clientA -> connect to -> Server Socket
```
The client then joins a Channel.
```
clientA -> join -> Channel
```
Another client B, does the same.
```
clientB -> connect to -> Server Socket
clientB -> join -> Channel
```

A channel is basically a litle machine that processes incoming messages.  Client A and Client B both connected to a little "server", an Elixir process.

The really cool part is that Phoenix comes with apis for broadcasting to all clients connected to the same channel.  In the next few sections we'll demonstrate how a client A will send a message that will be broadcast to be received by client B or any number of clients that join the same "room".

### Create a User Socket

Ok, enough theory let's create this socket thing.  Fortunately phoenix includes a generator for that too.  Run the following command in your terminal in your projects root folder but don't follow the instructions it spits out in the terminal.  We'll be doing something slightly different since we already have a liveview socket so we can piggy back on.  In other words the generator created a new js client and wants us to add a new endpoint, however we can just share the liveview socket that so that our front-end client doesn't need to join two different sockets.

```bash
mix phx.gen.socket User
```
This creates two files. 

```bash
* creating lib/xr_web/channels/user_socket.ex
* creating assets/js/user_socket.js
```
We're going to merge the javascript code in `user_socket.js` into `app.js` in moment.  Right now app.js is our only entry point.  It's the only js file that is included using a `<script>` tag in our root layout.  

### Create a Room Channel

Next we need to create a channel.  Channels can be made for different kinds of communication.  This one will be for communications and happenings that occur in a Room, so let's call it a `RoomChannel`.  And wouldn't you know it, there's a generator for that too.  Run this in the terminal as well.

```bash
mix phx.gen.channel Room
```
The autogenerated code in the user_socket.ex and room_channel.ex are 90% what we want, we just need to make a few tweaks.

### Let UserSocket Know About RoomChannel

Open `lib/xr_web/channels/user_socket.ex` and add this line:

```elixir
  channel "room:*", XrWeb.RoomChannel
```
In fact, that line might be there already, just uncomment it.  This `room:*` pattern means that the `RoomChannel` module will spawn new processes whenever a client joins a channel with the topic starting with "room:" e.g. "room:42".

### Modify RoomChannel Join function

Let's also modify the join function in the `room_channel.ex`

The generator created code that looks like this: 

```elixir
  def join("room:lobby", payload, socket) do
    if authorized?(payload) do
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end
```

We'll add authorization later, so just remove that bit for now.  Notice the pattern "room:lobby" is currently hardcoded.  This means this room channel can only handle one specific meeting room, the lobby.  We want to handle arbitrary meeting room ids.  We want to change it to look like this:


```elixir
  def join("room:" <> room_id, payload, socket) do
    {:ok, assign(socket, :room_id, room_id)}
  end
```

This `"room:" <> room_id` means we are pattern matching on a string that starts with "room:" followed by a variable that will match the rest of the string.  It's similar to destructuring in javascript.

Here's an example of this kind of pattern matching happening for "=" operator.

```elixir
iex(1)> "room:" <> room_id = "room:42"
"room:42"
iex(2)> room_id
"42"
```

The same kind of pattern matching is applied to function heads like `join` and in this case we're capturing the value of `room_id` then assigning it into the socket for use later on.

### Sharing the liveview socket

It turns out that Phoenx Liveview already comes with a web socket to send data diffs to the front-end to render components without re-rendering the whole page.  We've been using it already, the generate that we used to create the CRUD pages for rooms uses Liveview.

Look inside `assets/js/app.js`

```javascript
let liveSocket = new LiveSocket("/live", Socket, {params: {_csrf_token: csrfToken}})

```

The "/live" part references this endpoint defined in `endpoint.ex`

```elixir
socket "/live", Phoenix.LiveView.Socket, websocket: [connect_info: [session: @session_options]]

```

We can reuse this endpoint so that our front-end javascript code does not need to create an additional web socket just for our `UserSocket`.

Just add this line underneath that socket like this in `endpoint.ex`: 

```elixir
  socket "/live", Phoenix.LiveView.Socket, websocket: [connect_info: [session: @session_options]]

  socket "/live", XrWeb.UserSocket, websocket: [connect_info: [session: @session_options]]
```

Back in user_socket.ex comment out the default `use Phoenix.Socket` macro and replace with `use Phoenix.LiveView.Socket`.  This allows `UserSocket` to share the `LiveView` Socket:

```elixir
  # use Phoenix.Socket
  use Phoenix.LiveView.Socket
```

That will allow the `UserSocket` to piggyback on the LiveView socket.

### Join the Room Channel

Now we'll integrate parts of the advice in `user_socket.js` into `app.js`.  Since app.js is loaded on every page of our website, but we only want the channel to join the room when we're on a URL like `/rooms/:id`.  My solution to that is that we'll create a global function called `initRoom` in `app.js` that we'll then call from the `show.html.heex`.  This gives us the behavior that I want because that template only renders when we're on the rooms `show` CRUD path.

Add the following snippet to `app.js` after the liveSocket is created.  This creates an `initRoom` function that will join the `room` channel.  Notice the function takes two arguments, room_id and user_id which we can pass from the server to the browser.  This will be useful for knowing who we are.

```javascript
window["initRoom"] = async (room_id, user_id) => {
 
  liveSocket.connect(); // make sure we're connected first
  let channel = liveSocket.channel(`room:${room_id}`, {})
  channel.join()
    .receive("ok", resp => { console.log("Joined successfully", resp) })
    .receive("error", resp => { console.log("Unable to join", resp) })

}
```

Now we need to call this function, but we need to make sure we wait long enough until the function is defined.  Open up `controllers/room_html/show.html.heex` and replace the entire template with this:

```html
<body>
<script>
  window.addEventListener("DOMContentLoaded", function() {
    window.initRoom("<%= @room.id %>", "<%= @user_id %>")
  })
</script>
</body>
```

If you now navigate to any room you previously created and inspect the browser's console logs you should see:

```
Joined Successfully
```

But you won't see that on any other page you navigate to, which is what we want.
Congrats!  That was a lot of stuff, but we now have our front-end connected over web sockets and a room channel all the way to the backend!  We're ready to send and receive messages!

### Send and Receive a Test Message

I've you are knew to sending messages with channels, here's a quick demonstration.  Feel free to skim this section if you're already familiar with it.

Since w don't have a pretty UI or even buttons we can press to send any messages.  We're going to cheat a little bit and make a quick little test so we can be satisfied at our progress.  In `app.js` where we just created the channel, go ahead an assign it to the window object.  This will allow us to access the channel from the browsers console.

```javascript
let channel = liveSocket.channel(`room:${room_id}`, {})
window.channel = channel
```

Now back in our browser, (you should be using Chrome Browser), open up the dev tools and in the console tab run this command:

```javascript
channel.push("hi there")
```
This tells the browser to push the message "hi there" to the  `RoomChannel`. You may notice that doing so is immedately causes this message to appear in the console:
```
Joined Successfully
```
And that's because we caused the `RoomChannel` to crash because it doesn't know how to handle a message like "hi there".  Since the RoomChannel is supervised, when it crashes it is automatically and immediately respawned and our browser simply joins it again.  How awesome is that?

Take a look at the Phoenix logs and you'll see the error that caused the `RoomChannel` process to crash:

```elixir
[error] GenServer #PID<0.1280.0> terminating
** (FunctionClauseError) no function clause matching in XrWeb.RoomChannel.handle_in/3
    (xr 0.1.0) lib/xr_web/channels/room_channel.ex:18: XrWeb.RoomChannel.handle_in("hi there", %{},
    ...
    ...

```
This error message tells us exactly what we need to do to fix this.  Add a handle_in function that takes 3 arguments where the first argument is the pattern "hi there".

If we look into room_channel.ex you'll notice that there are already two handle_in examples that were autogenerated by the Phoenix generator:

```elixir
  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  # It is also common to receive messages from the client and
  # broadcast to everyone in the current topic (room:lobby).
  @impl true
  def handle_in("shout", payload, socket) do
    broadcast(socket, "shout", payload)
    {:noreply, socket}
  end
```

Let's change our message that we sent from the browser's console to this:

```javascript
channel.push("shout", {time: new Date()})
```

This time we sent a message that already had a `handle_in` defined and we added a second argument that is some arbitrary JSON payload I just made up.  The message and payload are broadcast to every connected client.  If we want to see that in javascript land let's add a javascript handler on the channel to react to the incoming message coming from the server.

Add this to code to `app.js` after the `channel` variable is defined:
```javascript
channel.on("shout", payload => {
    console.log("I received a 'shout'", payload)
})
```

When the client receives an incoming message "shout" from the server, we'll print it to the console log.

Now open up another window/tab in your browser (or use anothe browser) and navigate to the same room URL.  Remember it has to be the same room id.  Place the windows side by side and open up the devtools console in both windows.  You should see that both window consoles show `Joined Successfully`.  Now repeat the 
```javascript
channel.push("shout", {time: new Date()})
``` 
command as before.  You see that the `I received a 'shout'` message is received across windows.  In order words, when you push a message from a client, the same message is forwarded to every connected client!

We now have our first browser to browser interaction and it forms the basis of being able to syncronize more complex payloads like positions and rotations etc, for our future 3D objects in a shared VR space.  We just have to define our message schemas and our handlers in both the `RoomChannel` and the javascript side.

## Securing the WebSocket

At this point we've proven that we can send messages back and forth from one browser to another.  We've sort of played it fast and loose so let's go back and tidy a few things up.  Phoenix provides a way of doing authentication in the `UserSocket`.  You may have noticed code snippets in the code generated in `user_socket.js` that tells us what to add.  The basic idea is that our backend will send a bit of encrypted data to the front-end such as the user's id.  And when we connect to the socket from the front-end we'll send that encrypted data back to the server for verification.  Any party that attempts to connect to our socket without providing the user token will not be able to join our room channel.  In the `UserSocket` module we'll unencrypt the user token, retrieving the user_id and add it into the socket so that it's available in the `RoomChannel`.  That's a lot to take in.  

First we'll need a user_id.

### Creating a unique id per visitor

We'll defer creating a full fledged login system until later.  But for now, we need a way give each visitor a unique id so that we can tell one person from another.  We'll also use the user_id as the bit of data to send back and forth for authentication.

Open up `router.ex` and type the following function:

```elixir
 def maybe_assign_user_id(conn, _) do
    case get_session(conn, :user_id) do
      nil ->
        user_id = Ecto.UUID.generate()
        conn |> put_session(:user_id, user_id) |> assign(:user_id, user_id)

      existing_id ->
        conn |> assign(:user_id, existing_id)
    end
  end
```

This function (known as a function plug), just follows a certain convention.  It takes a conn (a kind of connection struct), and second argument for some options that we don't care about now.  Then it creates a new conn that adds a unique user_id into the cookie session, but only if it wasn't there already.  That means we get a sticky identifier for each visitor.  We also add the user_id into the `assigns` map of the `conn` so that it's readily available.

Next we'll add this plug into the browser pipeline so that every page load will process our plug function:

```elixir
pipeline :browser do
  plug :accepts, ["html"]
  ...
  #add it at the end
  plug :maybe_assign_user_id
end
```

Now every visitor to the website will get a unique user_id in their session and they haven't even had to login or register.  How convenient!

### Add User Token to Conn

We now have a unique user_id in the cookie session.  But we need to send it down to the front-end encrypted as a user_token.  Let's add another function plug in `router.ex` for creating an encrypted token from the user_id.  We'll then pass this to the frontend so it can be passed back to the server and verified in the `UserSocket`

```elixir
 defp put_user_token(conn, _) do
   if user_id = conn.assigns[:user_id] do
     token = Phoenix.Token.sign(conn, "some salt", user_id)
     assign(conn, :user_token, token)
   else
     conn
   end
 end
```

This code signs a token with "some salt" for now.  And assigns it to the `conn`, so it's available in our templates.

Again, add this plug in the browser pipeline, but put it after our last plug because we depend on user_id being in the `conn.assigns`:

```elixir
pipeline :browser do
  plug :accepts, ["html"]
  ...
  #add it at the end
  plug :maybe_assign_user_id
  plug :put_user_token
end
```

### Add User Token to Frontend

Now we need to pass this token to JavaScript. We could add a snippet of javascript to set the token on the window object, but I'm paranoid that the evaluation order of script tags makes this vulnerable to race conditions.  I'll side step the paranoia by just injecting the token into the HTML at `root.html.heex` layout.  This is also what Phoenix itself does with the csrf_token.

```html
<meta name="user-token" content={assigns[:user_token]} />
```

### Add User Token to Client Side Socket Connection Code

Then when we make the liveSocket in `app.js` let's grab it and pass it in the `LiveSocket` constructor options.  Again this is following what Phoenix does with the csrf_token.  Your `liveSocket` should look like this:

```javascript
let userToken = document
  .querySelector("meta[name='user-token']")
  .getAttribute("content");

let liveSocket = new LiveSocket("/live", Socket, {params: {_csrf_token: csrfToken, _user_token: userToken}});
```

### Verify User Token in Server side Socket Connect Callback

Now we open up `user_socket.ex` and replace the default `connect` function with this snippet that will verify the user token:

```elixir
@impl true
def connect(%{"_user_token" => token}, socket, _connect_info) do
  case Phoenix.Token.verify(socket, "some salt", token, max_age: 1_209_600) do
    {:ok, user_id} ->
      {:ok, assign(socket, user_id: user_id)}

    {:error, _reason} ->
      :error
  end
end

# if user_token is not provided, which is the case for phoenix live dashboard
# return :ok, so the socket can still connect, but the room channel don't allow join to succeed
@impl true
def connect(_, socket, _connect_info) do
  {:ok, socket}
end
```

### Verify RoomChannel Gets UserId

At this point we have completed authenticating the socket and we have this additional user_id in the socket we can use in `RoomChannel`.  Let's test that everything is hooked up properly by broadcasting the `room_id` and `user_id` whenever any client joins.

Open up `room_channel.ex` and modify `join` function to be like this:

```elixir
def join("room:" <> room_id, _payload, socket) do
  if (socket.assigns.user_id) do
    send(self(), :after_join)
    {:ok, assign(socket, :room_id, room_id)}
  else
    {:error, %{reason: "unauthorized"}}
  end
end
```

The `join` function, on a successful operation should return a tuple with `{:ok, socket}`.  Here we are adding the room_id into the socket so we have some memory to use in other handlers.  `user_id` is already in the socket assigns thanks to the `UserSocket` connect callback putting it in there (we did that!).

This `send` function is a built in function that will send a message to any Elixir process.  In this case we're sending a message to ourselves, `self`, right after we've joined.  Once we've joined, (and not before) we can utilize the channel APIs like `push` (send a message to my client and no one elses), `broadcast` (send a message to all clients) etc.  We need to add a new handler to handle the `:after_join` message.

```elixir

  @impl true
  def handle_info(:after_join, socket) do
    broadcast(socket, "shout", %{user_id: socket.assigns.user_id, joined: socket.assigns.room_id})
    {:noreply, socket}
  end
```
This handler receives the `:after_join` message and will call the `broadcast` api to send an message to all the connected clients of this room.  Since our javascript code is already console.log-ing anytime the server is pushing down a message of event "shout", we can see this at play in the browser's console.  To test this, open up multiple browser windows, navigate to a specific room and view the console.logs.  

You should see something like:

```javascript
I received a 'shout' {joined: '0ba687f4-2dbc-428b-ba3a-a7699845f141', user_id: 'fe7aca02-d76f-4fc4-b92e-76cbd1b99d72'}
```

Yay!  We're seeing the user_id now.  Remember that to obtain a different user_id on the same browser, one of your windows needs to use Incognito mode, or just use a different browser on your machine.  This is because the session user_id is tied to the cookie which is shared among tabs and windows of the same browser and domain.  

We can safely delete `user_socket.js` now because we integrated its javascript code and all its advice.

## Adding Babylon.js

At this point we not only have browser-to-browser two way communication, we also have the concept of isolated room communications as well as unique user ids assigned to each user session.  It would now be a good milestone if we can add some frontend graphics.  Babylon.js is written in Typescript, so it would be advantageous to also use typescript for all our frontend code to take advantage of typechecking.  In this next section I'll be switching out javascript for typescript, changing out the default Phoenix Esbuild for node based esbuild, adding a custom build script for enable typechecking and code splitting, installing babylon npm packages then writing code to create a basic 3D scene.

### Install node

In order to install esbuild and babylon packages with npm, we'll need node installed first.  Skip ahead if you already have node on your machine.

I'll be installing node through `nvm` (useful for when you're working on multiple projects with different versions of node):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
```

Add this to your shell script.

```bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Now install the latest node:

```bash
nvm install node
```

Now I create a .nvmrc file in this project directory so that we declare which version node we want:

```bash
echo "v21.5.0" > .nvmrc
```

That allows us to do this in the project folder:

```bash
nvm use
Found '/home/titan/web_projects/xr/.nvmrc' with version <v21.5.0>
Now using node v21.5.0 (npm v10.2.4)
```

Now we're ready to use npm.  (In case I forget to mention it, any `mix` commands are run from the project root, whereas any `npm` commands should be run from the `assets` directory.)

The following command will create a package.json file and a node_modules folder that contain packages that we'll need.
```bash
npm install esbuild @jgoz/esbuild-plugin-typecheck @types/phoenix_live_view @types/phoenix @babylonjs/core @babylonjs/gui @babylonjs/materials @babylonjs/inspector --save-dev

npm install ../deps/phoenix ../deps/phoenix_html ../deps/phoenix_live_view --save
```

Now that we have esbuild installed, we can create a custom build script.  The reason for doing this is because the default version that comes with Phoenix does not allow you to configure  plugins.  We need the plugins in order to do typescript typechecking.  So let's just swap it out.

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
    sourcemap: "inline",
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
config :hello, HelloWeb.Endpoint,
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

Remove the esbuild configuration from `config/config.exs`.  Remove the esbuild dependency from `mix.exs`.

Unlock the esbuild dependency so that it is also removed from the lock file:

```bash
mix deps.unlock esbuild
```

At this point we have successfully removed the Phoenix default esbuild mix dependency and rolled our own esbuild using node and npm.  

If you look at `build.js`, notice that the options will use the experimental code splitting ability recently added to esbuild.  The splitting option only supports "esm" format for now and therefore and we need to add `type="module"` to the script tag that brings in `app.js` in root layout or we'll get an error like "Cannot use import statement outside a module".  

### Add tsconfig.json

Since we'll be switch to typescript, add this file `assets/tsconfig.json`

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

### Restructuring for Systems

Now we can start to add our typescript files.  So far we've just been dealing with a single file `app.js` but that will become unwieldy soon.  

It would be good to split the code base up into managable files with each file responsible for some particular feature/aspect of our game (TBD).  

Let's create a folder in `assets/js` called `systems`.

Within that folder we can create a file called `broker.ts` that is responsible for connecting to the `RoomChannel` as we did previously.  And we can have another file called `scene.ts` that is responsible for creating an HTML canvas on the page to draw our 3D scene.  

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

This file creates initializes a `config` variable.  When other typescript files import this file they'll get access to the `config` and can read or write to it.  This this is typescript we cannot add new properties at will.  Anytime we feel the urge to add a new property we'll need to add it to the Config type.  That may be a chore but the benefit is that we have types and intellisense will help remind us what common shared variables are available.

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

You'll notice that this is just a port of the code we had before for joining a channel.  Except we are getting the socket and room_id from the config.  

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
The `scene.ts` contains typical Babylon.js getting started boilerplate to setup a canvas, engine, camera and scene.  It also includes a shortcut to open the inspector if we need to do some debugging (notice we use async imports in order to keep the bundle size smaller by taking advantage of esbuild's code splitting feature).  The scene is created in this file and then assigned to the `scene` key in the `config` object.  It's important that any systems that need to make use of `config.scene` be evaluated after `config.scene` is available.

#### Add room.ts

To tie everything together, we need to import each system in the correct order.  Add this file `assets/js/room.ts` to load each system we've made so far.

```typescript
import "./systems/broker";
import "./systems/scene";
```

Finally let's bring it all back to the entry point.

### Replace app.js with app.ts

Rename `app.js` to `app.ts` and replace the file contents  with the following:

```typescript
// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";
// Establish Phoenix Socket and LiveView configuration.
import { Socket } from "phoenix";
import { LiveSocket } from "phoenix_live_view";
import topbar from "../vendor/topbar";

let csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content");
let userToken = document
  .querySelector("meta[name='user-token']")
  .getAttribute("content");

let liveSocket = new LiveSocket("/live", Socket, { params: { _csrf_token: csrfToken, _user_token: userToken } }) as LiveSocket & Socket;

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
window["liveSocket"] = liveSocket;

window["initRoom"] = async (room_id: string, user_id: string) => {
  const { config } = await import("./config");
  config.room_id = room_id;
  config.user_id = user_id;
  config.socket = liveSocket;
  await import("./room");
};
```
This typescript version has a few small changes.  I've added some type declarations here and there.  The biggest change is that the `initRoom` function is now responsible for invoking `config` for the first time, and populating some important shared data like the socket, room_id and user_id.  It also imports `room` which imports all the systems.  Again we use dynamic imports so that if initRoom is not called none of the Babylon.js and room related code needs to be loaded, which keeps the rest of the pages super fast.

You should end up with a `assets/js` folder structure like this:

```
├── app.ts
├── config.ts
├── room.ts
└── systems
    ├── broker.ts
    └── scene.ts
```

### Verify Asset Bundles

If you want to see the assets that these source typescript files turn into, start your dev server `iex -S mix phx.server` then take a look inside `priv/static/assets` folder.  The watchers are hard at work observing any changes to the typescript files and then esbuild is bundling and splitting the files here.  These might look very big now and that's because in development we're not minifying any code and we're also including source maps inline in the file.  To see what the file sizes will look like for production run `mix assets.deploy`.  This will create the minified, no sourcemap, gzipped versions of the files.  Run `mix phx.digest.clean --all` to remove files created.

### Babylon Added Summary

Whew!  A lot happened in this section.  We've successfully added babylon.js, but to do that we had to change out the way Phoenix packages and bundles its javascript and at the same time we organized our own folder structure to make it easier to add more functionality going forward.

Open up your browser and navigate to a specific room URL and you should see a 3D scene.  Our camera is also already integrated with the keyboard and mouse so you can travel around in the scene, by clicking and dragging your mouse and then using the cursor keys to move forward or backward.  To open up the Babylon.js inspector we've added a short-cut (CTRL-b), so that we can inspect the meshes in the scene.  



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
Xr.Rooms.entities("453b6858-9403-4dd9-a58e-17d25737be84") # get your room_id from your browser's URL bar
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

### Add some color

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

## Event Driven Architecture

By now you might be noticing a pattern that is emerging. We've been very focused on the message payloads that we create.  In fact, messages are at the core of this design architecture.  

- Design an message describing some domain event
- Send the message to the client
- Create a system that listens to the message and have Babylon.js modify the 3D scene in some way

### Event Sourcing

There is an architectural pattern called event sourcing where we strategically put every thing important to us that can happen into an ordered stream of events (called an Event Stream).  An event is a fact that has just happened.  It has just enough information to allow us to re-create the state (or view) purely from processing those events in order again.  It's very useful for auditing what happened because you have a perfect cronological log.  It's useful for testing and debugging because we can replay the events into the UI to see if the view renders everything correctly based off of the events.  And we get a replay feature for free in order to experience immersive meeting room replay.

We can have any number of subscribers listening to the event stream building up their own "projections", aka views of the data that are built-up by processing each event.

### Message Producers

A message can originate from different sources depending on these scenarios:

1. Initial state snapshot.  We already implemented this.  This message originates from the server and is sent to the client when they join so they can draw all the initial scene.
2. User generated events.  These are messages that the user initiates by taking some action.  These messages originate in the front-end and are sent to the server and then broadcast to all the other connected clients.
3. System generated events.  These are messages that are indirectly triggered by something that has happened.  It could even be just the passing of time.  For example we could have a system that emits periodic events to open a door every 60 seconds then close 15 seconds after that.  We could have a system observe if bullets actually hit zombies and emit an event that the zombie was killed.  These events also originate on the client but should only come from one client otherwise we could end up with duplicate or conflicting events if they are calculated on every client.
4. Server generated event.  Lastly these types of events come from the server and supplement events that cannot be generated on the client side.  For example the client cannot tell us they have left if they just close their browser and disconnect.  The server however can detect that the client has detached and emit an event that that user left.

### Phoenix PubSub

Phoenix comes with a library called PubSub which allows any process to subscribe to a named topic  and for any code to broadcast messages on a topic.  This is very convenient to easily allow any Elixir process to talk to another process.  

Here's an example of how to use PubSub in the iex terminal:

```elixir
alias Phoenix.PubSub
PubSub.subscribe(Xr.PubSub, "stream:123")
:ok
Process.info(self(), :messages)
{:messages, []}
PubSub.broadcast(Xr.PubSub, "stream:123", {"user_moved", %{"user_id" => "tom", "pose" => ...}})
:ok
Process.info(self(), :messages)
{:messages, [{"user_moved", %{"user_id" => "tom", "pose" => ...}}]}
```
In this simple example we subscribe to a topic "stream:123", broadcast a message to it and then see that our process mailbox received the message.

This understanding sets us up to create an event-stream for our room.  Everything that is important about a room should be broadcast on the stream.

## Presence

The first events that we will work on will help us establish where our avatars should be in 3D space.  Our goal is to produce some events like this:

```
{event: "user_joined", payload: {user_id: "tom", position: [...], rotation: [...]}}
{event: "user_moved", payload: {user_id: "tom", position: [...], rotation: [...]}}
{event: "user_left", payload: {user_id: "tom"}}
```

### Phoenix Presence

To help us with the join and leave type of messages we're going to rely on a built in library called Phoenix Presence.  This pattern injects the ability to track which users are connected to a channel.  By default usage of Phoenix Presence sends a "presence_diff" message to each connected client whenever clients join or leave the channel.    

Read more about it here: https://hexdocs.pm/phoenix/Phoenix.Presence.html  

Let's get started!  And wouldn't you know it?  There is a generator for this too.  Gotta love them generators!

```bash
mix phx.gen.presence
```

This creates a new file for us `xr_web/channels/presence.ex`.

Add your new module to your supervision tree, in `lib/xr/application.ex`, it must be after `PubSub` and before `Endpoint`:

```elixir

    children = [
      {Phoenix.PubSub, name: Xr.PubSub},
      ... 
      XrWeb.Presence,
      ...
      XrWeb.Endpoint
    ]

```

Modify `xr_web/channels/room_channel.ex` and add ` alias XrWeb.Presence` near the top of the file and also redefine the `after_join` handler:

```elixir
...
alias XrWeb.Presence
...

def handle_info(:after_join, socket) do
  {:ok, _} = Presence.track(socket, socket.assigns.user_id, %{})

  entities = Xr.Rooms.entities(socket.assigns.room_id)
  push(socket, "snapshot", entities)
  {:noreply, socket}
end
```

By adding `Presence.track` we now automatically get a channel message of event `presence_diff` pushed down to the browser anytime a client joins or leaves (by closing the browser).  

If you want to log all the messages coming from the `RoomChannel`, I like to use this bit of debug code to `broker.ts` (we'll remember to remove it later):

```typescript
channel.onMessage = (event, payload, _) => {
  if (!event.startsWith("phx_") && !event.startsWith("chan_")) {
    // since this is debug level you'll need to set you browser's log level accordingly
    console.debug(event, payload);
  }
  return payload;
};
```

Go ahead and open two browser tabs and navigate to an existing room and inspect the console log to see what the data payloads look like when you open additional browsers or when you close them.  Your `console.debug` should show you a payload like:

```javascript
presence_diff {joins: {"39jfks9...": ...}, leaves: {}}
```

Ok, great... that's useful if we only wanted to make a list of users, but we can't draw an avatar without also knowing where to draw it and the presence_diff doesn't give us position or rotation information.  That's something we're going to need to get from Babylon.js (the camera position and rotation) and push it up to the server via a `channel.push` method.



## Ask for User First Interaction

Instead of immediately connecting to the room channel as soon as the page loads, let's pop up a modal to ask the user if they want to "enter" the room in the first place.  This sets up the ability to do some gating later.  We can't stop browsers from loading a public webpage if they know the meeting room_id, but we can prevent them from entering the event if they are unauthorized, don't have a password or invite, etc.  This means we don't waste channel resources and don't connect them to the room until they are qualified.  An even more important benefit is that we get our "first user interaction" out of the way.  This initial interaction (a click) is required in order to unblock us from using some browser APIs, such as checking what audio devices they have like microphone etc. 

Let's modify the room controller's `show.html.heex` page to drop in a Phoenix liveview so we can create some dynamic HTML over our scene.

```elixir
<script>
  window.addEventListener("DOMContentLoaded", function() {
    window.initRoom("<%= @room.id %>", "<%= @user_id %>")
  })
</script>
<%= live_render(@conn, XrWeb.RoomMenu.Index, session: %{"room_id" => @room.id}) %>
```

This live_render function loads a LiveView.  It expects a module, in this case named `XrWeb.RoomMenu.Index`, let's create that module now.

### LiveView Module

Add a file at `lib/xr_web/live/room_menu/index.ex`

```elixir
defmodule XrWeb.RoomMenu.Index do
  use XrWeb, :live_view

  @impl true
  def mount(_params, %{"user_id" => user_id, "room_id" => room_id}, socket) do
    {:ok,
     assign(socket,
       user_id: user_id,
       room_id: room_id,
     ), layout: false}
  end
end
```

This creates a liveview process and is mounted with some initial state.  The room_id and user_id were passed into the LiveView process from the front-end.

### LiveView Template

The liveview expects a rendering function or a template file.  Let's create a template file at `lib/xr_web/live/room_menu/index.html.heex`

```html
<div id="room_modal" class="z-10 fixed inset-0 flex items-center justify-center">
  <div class="fixed inset-0 bg-black opacity-50"></div>
  <!-- Modal Content -->
  <div class="fixed z-20 bg-white p-8 rounded-md shadow-md w-96 text-center">
    <p class="text-lg text-gray-800">Your modal content goes here.</p>
    <button
      class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md"
      phx-click={
        JS.hide(to: "#room_modal")
        |> JS.dispatch("live_to_xr", detail: %{"event" => "enter_room"})
      }
    >
      Enter Room
    </button>
  </div>
</div>

```
There is a bit to unpack here.  This very simple model is styled with tailwind classes to appear ontop of everything.  The meaty part here is the phx-click attribute and 

```elixir
JS.hide(to: "#room_modal")
        |> JS.dispatch("live_to_xr", detail: %{"event" => "enter_room"}) 
```
Which is a pipe of two elixir functions that actually become javascript functions.

### LiveView JS Interop

We want the modal to disappear when the button is clicked.  But we also want to trigger the front-end to connect to the channel after we click the button. Phoenix Liveview is considered server-side code written in Elixir, rendered as HTML and sent to the frontend on mount.  Typically Phoenix Liveview can receive information from the front-end.  Clicks for example, send data through the LiveView channel to the LiveView process through the use of special HTML attributes like `phx-click`.  

Typically usage would be something like:

```html
<button phx-click="inc">Click Me</button>
```

That would then send a message of "inc" to the liveview process and we'd have to write handler to handle it and we modify some state.  Liveview pays attention to what parts of the state are used in the front-end and diff are sent down the wire for the front-end to weave in the UI changes.

However in this case there is no point to send a message to the server because we actually want to send a message the the rest of our javascript.  We just want to simply call `channel.join` located in our `broker.ts`.  Fortunately Phoenix provides a way to trigger certain common tasks purely in the front-end without involving the server.

Phoenix provides an Elixir module called JS for javascript interop.  There is a function called JS.dispatch that when rendered and mounted will invoke some javascript that creates a window custom event when clicked.

If we do something like this for example:
```elixir
<button phx-click={JS.dispatch("live_to_xr", detail: %{"event" => "enter_room"})}>
  Click here to enter
</button>
```

A custom javascript event will bubble to the window object.  The event name is "live_to_xr" and the event will have a detail object that contains any parameters we want to include with the event.

Then to subscribe to this event in the front-end we can open up our `broker.ts` and the following:

```typescript
window.addEventListener("live_to_xr", e => {
  if (e["details"]["event"] == "enter_room") {
    channel
      .join()
      .receive("ok", (resp) => {
        console.log("Joined successfully", resp);
      })
      .receive("error", (resp) => {
        console.log("Unable to join", resp);
      });
  }
});
```

This is the same channel joining code we had before, just now wrapped in an event listener to the "live_to_xr" event.  We can also hide the model after the click without involving a round trip to the server by just using `JS.hide(to: "#room_modal")` which is piped inside the `phx-click`.

### Summary

With these changes we have implemented a click-to-join type of model.  Instead of joining the channel as soon as possible, we're only joining once the enter room button was clicked.  Once the channel is joined it pushes the front-end a snapshot of obstacles in the room for a particular hue of colors.  The front-end's snapshot system receives the message and loops through every entity, drawing a box using the Babylon.js CreateBox function.   




## Entering the Room at a Spawn Point

Thus far we've hardcoded our camera at a fixed location in the scene like security camera overseeing everything.  But different rooms have different obstacles and they ought to have different rules governing where we start.  Let's let the room tell us where we can start.  This is sometimes called a "Spawn Point".  Since we already have some obstacles that are created in the database table of entities and components, why don't we just add another entity for "spawn_point"?

### Create Spawn Point Entity

Create a new entity called `spawn_point` in the `generate_random_content` function:

```elixir
 # create spawn_point
   create_entity(room_id, Ecto.UUID.generate(), %{
      "spawn_point" => true,
      "position" => [Enum.random(-10..10), 2, Enum.random(-10..10)]
    })
```

The spawn_point for now is just a random point in 3D space between -10 and 10 on the x and z axis, but limited to 2 meter tall in the y axis so we don't spawn underneath the floor which is typically at y = 0.

You can clear all the rooms in the database you've created so far by stopping your server and running `mix ecto.reset`.  That will recreate and migrate all the tables.  Then start your server and create some new rooms, each new room created will have a spawn_point from now on.

We could at this point create front-end code to listen for the spawn_point and move our camera there... however, before we implement that, there are two issues with that approach:

1. If every client is launching into the room at exactly the same position of the spawn_point we will all be on top of each other and can't see anybody else at first.  We should spawn around the spawn_point with some randomness so it's unlikely we'll be directly on top of each other.
2. If we have some internet trouble, a common fix is to try to refresh the browser.  If we reload the scene and process the spawn_point as our camera location, we'll always end up back at the spawn point instead of picking back up where we left off.  We should retain our previous location.

This implies that the server should retain some memory of where the user is.  If the server knows our previous location, when we enter a room it can tell us where we were and that is where we should put our camera.  If the server has no previous data for us, then the server should pick a location near the spawn point and send that as a message.

### Create a Memory Store for User State

Let's create a small server that specializes in storing data about each connected user.  To start off with this in-memory database will store position and rotation data for each user, so that the server has it readily available.

Create a new file in `lib/xr/server/user_snapshot.ex` and paste this boilerplate to create a simple GenServer.

```elixir
defmodule Xr.Servers.UserSnapshot do
  use GenServer

  def start_link() do
    GenServer.start_link(__MODULE__, [])
  end
  @impl true
  def init([]) do
    {:ok, %{}}
  end

end
```

We can go to our terminal after starting `iex -S mix phx.server` and start an instance of this GenServer.

```elixir
>Xr.Servers.UserSnapshot.start_link()
{:ok, #PID<0.524.0>}
```

That returns an `{:ok, pid}` tuple and if we pattern match it we can get the pid and check it's state.

```elixir
>{:ok, pid} = Xr.Servers.UserSnapshot.start_link()
{:ok, #PID<0.525.0>}
>:sys.get_state(pid)
%{}
```

The state is an empty map as expected.

### Add Handlers To Receive Movement Data

We want to allow this UserSnapshot Genserver to receive position and rotation data.  Let's add a function for the client api:




This GenServer is un-named right now, so we can't talk to it unless we have its pid.  Let's use a process registry so that we can use the room_id to get to this pid and it also ensures that we only have one of these databases.  

Create a Registry by adding this line in the `applications.ex` children's list after the `Endpoint`:

```elixir
 {Registry, keys: :unique, name: Xr.RoomsRegistry},
```

Add this to the `user_snapshot.ex` file:

```
  def via_tuple(room_id) do
    {:via, Registry, {Xr.RoomsRegistry, "user_states:#{room_id}"}}
  end

  def start_link(room_id) do
    GenServer.start_link(__MODULE__, {:ok, room_id}, name: via_tuple(room_id))
  end
```

Restart your server and try the following.  
```elixir
> Xr.Servers.UserSnapshot.start_link("hi")
{:ok, #PID<0.540.0>}
> Xr.Servers.UserSnapshot.start_link("hi")
{:error, {:already_started, #PID<0.540.0>}}
```
You should see that the UserSnapshot GenServer cannot be started twice for the same room_id:

Let's also add a supervisor for our UserSnapshot.  Create a new file at `lib/xr/servers/rooms_supervisor`

```elixir
defmodule Xr.Servers.RoomsSupervisor do
  use DynamicSupervisor

  def start_link(_arg) do
    DynamicSupervisor.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  def init(:ok) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  def start_room(room_id) do
    DynamicSupervisor.start_child(__MODULE__, {Xr.Servers.UserSnapshot, room_id})
  end

end
```
This supervisor will supervise any new rooms we tell it to, and if they crash it will just restart the crashed child.

We want to start this supervisor automatically when Phoenix starts our application so add it to the bottom of the children list in `application.ex`.

```elixir
  children = [
    ....
    Xr.Servers.RoomsSupervisor
  ]
```

Now we can use the RoomsSupervisor to create our UserSnapshot GenServer when we launch into our room from the `show` function in the RoomsController.  Modify the show function like this:

```elixir
def show(conn, %{"id" => id}) do
  room = Rooms.get_room!(id)
  Xr.Servers.RoomsSupervisor.start_room(room.id)
  render(conn, :show, room: room)
end
```
This starts the UserSnapshot Genserver if it hasn't already started, and if it has it will silently fail.

#### Server Tells User Where They Should Be

Let's do a review of how we connect to a room:

1. We load the page `rooms/:id` and see the modal
2. We click the modal button and the `broker.ts` joins the channel
3. The RoomChannel `after_join` handler sends down a snapshot
4. The snapshot contains information about the room and we draw it.

What we would like to receive at this point is locations of all the avatars so we can draw them, and figure out where to draw ourselves.

Instead we're going to focus our attention to the server-side because the server will tell the client where they need to be, starting with the spawn_point.

### Add Query Entities by Component Name

First we need a way to quickly look up the spawn_point for a room (there could be many spawn_points, we'll just pick the first).  Add this query to the `rooms.exs` file:

```elixir
def find_entities_having_component_name(room_id, component_name) do
  q =
    from(c in Xr.Rooms.Component,
      where: c.room_id == ^room_id and c.component_name == ^component_name,
      select: c.entity_id
    )

  from(c in Xr.Rooms.Component,
    where: c.room_id == ^room_id and c.entity_id in subquery(q)
  )
  |> Repo.all()
  |> components_to_map()
end
```

This query will essentially let us look up all entities that have a particular component name which will help us lookup all the room's spawn_points.  

It'll give us output like this:

```
%{
  "d32aaea5-0ca9-4143-bae7-8d0e66f05490" => %{
    "position" => [6, 2, 9],
    "spawn_point" => true
  }
}
```




## Designing Events and Messages

By now you might be noticing a pattern that is emerging. We've been very focused on the message payloads that we create.  In fact, messages are at the core of this design architecture.  

- Design an message describing some domain event
- Send the message to the client
- Create a system that listens to the message and have Babylon.js modify the 3D scene in some way

The message can originate from different sources depending on these scenarios:

1. Initial state snapshot.  We already implemented this.  This message originates from the server and is sent to the client when they join so they can draw all the initial scene.
2. User generated events.  These are messages that the user initiates by taking some action.  These messages originate in the front-end and are sent to the server and then broadcast to all the other connected clients.
3. System generated events.  These are messages that are indirectly triggered by something that has happened.  It could even be just the passing of time.  For example we could have a system that emits periodic events to open a door every 60 seconds then close 15 seconds after that.  We could have a system observe if bullets actually hit zombies and emit an event that the zombie was killed.  These events also originate on the client but should only come from one client otherwise we could end up with duplicate or conflicting events if they are calculated on every client.
4. Server generated event.  Lastly these types of events come from the server and supplement events that cannot be generated on the client side.  For example the client cannot tell us they have left if they just close their browser and disconnect.  The server however can detect that the client has detached and emit an event that that user left.

### Event Sourcing

All these events, even if coming from different sources, if properly gathered and ordered with a timestamp can be used to construct an event stream.  There is an architectural pattern called event sourcing which simply means to collect events as a single source of truth so that we can transform the stream into projections, which are just alternate views of the data.

### Phoenix PubSub

Phoenix comes with a library called PubSub which allows any process to subscribe to a topic and for any code to broadcast messages on a topic.  This is very convenient to pass messages around without coupling the sender and receiver.

Here's an example of how to use PubSub:

```elixir
alias Phoenix.PubSub
PubSub.subscribe(Xr.PubSub, "room:123")
:ok
Process.info(self(), :messages)
{:messages, []}
PubSub.broadcast(Xr.PubSub, "room:123", {"user_moved", %{"user_id" => "tom", "pose" => ...}})
:ok
Process.info(self(), :messages)
{:messages, [{"user_moved", %{"user_id" => "tom", "pose" => ...}}]}
```


### Create an Event Sink Server

First lets create a destination that can receive our events.  Elixir is a language that was build with message passing to processes as a first class citizen.  We'll create a GenServer to receive all the events that occur in a room.  We can then 

### First Person Shooter Events

Let's make a list of some common things that happen in games like Doom and see if we can make an outline for all our events:

1. Player moving around - observe our camera movement and send an event to the server that we moved.  `{note: "player_moved", eid: "user-id", c: {pose: {....}}}`.  When processing the event we should draw the avatar at the new location.
2. Player discharging a weapon - observe a trigger press and send an event that we shot a bullet. 
   `{note: "bullet_fired", by: "user-id", from_position: [], orientation: [], bullet_id: ...}`. When processing the event we should play a sound and animate an effect.  We might also update the ammo count.
3. Opening a door - in the client we observe if we click a door or step on a trigger and send an event.  When we process the event we animate the door going up and play a sound.
4. Monster moving around - in one of the clients at acts as a leader, emit an event of the monsters new location.  When processing the event draw the monster in the new location.
5. Monster throwing a fireball - in the leader, emit an event of the fireball.  In all clients draw and animate the fireball flying in a certain direction.
6. Player hit by a fireball - in the leader
7. Monster hit by a bullet.
8. Monster dies
9.  Collecting a weapon.
10. Switching to a different weapon.
11. Collecting health.
12. Collecting immunity.
13. Collecting ammo.
14. Collecting a key.
15. Player reached end goal.
16. Player was killed.







### CRUD Events vs High Level Events

If everything in our scene is an entity, with an entity_id and components which are just data, then should our events just be CRUD messages around creating and deleting entities and then updating components on entities?

The implications of this would be that we have only a handful of types of messages like this:
- `{create: "entity-id", components: {...}}`
- `{update: "entity-id", components: {...}}` 
- `{delete: "entity-id"}`

The delete message is easy to handle because you just need to find that object by its entity id and dispose of it in the scene.  For both create_entity and update_entity we need to loop through it's components and those respective systems will either create or update the object and manipulate it in the scene.  This somewhat conforms to the schema we already have with the snapshot message.  And this maps directly to database CRUD operations.  On the serverside, we just make a handler loop through all the components and insert that into our Postgres database for the updated snapshot.  If we get a delete event we just remove the entity and all its components from the database.

As an alternative to CRUD like events, we can opt for "High level" events.  These are events that tell a story.  If you were to read a log of events it would sound like "user_joined", "user_walked", "user_jumped", "user_grabbed", "user_threw".


There are some issues with these messages though:

- Hard to read the intent of the message.    


Now that we have a way of looking up the spawn_point entity for a room, we also need a way of storing and looking up the last known location of a user.  The idea here is:

1. When a client joins the room channel:
2. Check if we have a previous location for the user
3. If yes, send the user_joined message along with the previous location
4. If no, send the user_joined message along with the spawn_point location
   
To do step 2 (check previous user location) we'll need a server-side database.  One idea is to just stash the user data into our Postgres database since components and entities can be anything including users.  However thinking about how frequently users are going to be moving around, making round trips to a persistent disk storage is going to be very chatty to our database server.  I also think that users should be treated differently than things

However in memory storage that is fast and able to be simultaneously updated by many clients.

### Create ETS Table for User Snapshot

Elixir is based on Erlang and Erlang comes with a fast in-memory database called Erlang-Term-Storage (ETS).

To create a new ETS Table we do this:

```elixir
table = :ets.new(:some_atom, [:set, :public, {:write_concurrency, true},{:read_concurrency, true}])
```

An ETS table is linked to the process that created it.  So if the parent process dies or is shutdown than the child will be shutdown and memory reclaimed as well.

The configuration above creates a table that has:

- unique keys (desirable because every person is unique)
- is writable by all processes (desirable so every client's room channel process can add their own data)
- concurrent on reads and writes so multiple processes can access the data simultaneously

To insert data provide the table reference and a tuple of {key, value} and to lookup data provide the table reference and the key:

```elixir
> :ets.insert(table, {"key", %{}})
true
> :ets.lookup(table, "key")
[{"key", %{}}]
```

You can get the whole table as a list of key/value pairs using:

```elixir
>:ets.tab2list(table)
[{"key", %{}}, ...]
```

Now for the tricky part:

- Where do we instantiate this table?
- How do we pass a table reference into the room channel?

###

```
             +----------+                  
         +---|Supervisor|--+               
         |   +----------+  |               
   +--------+       +--------+             
   | Room 1 |       | Room 2 |             
   | Child  |       | Child  |             
   +--------+       +--------+       
```



You can set the name of a table to a unique atom like our room uuid turned into an atom, but since atoms are not garbage collected we should not create atoms from unbounded data.

The `table` is some kind of Elixir `reference` so we need a way of sharing the reference to all room channels.

We don't have an index on room_id and component_name so let's add one.  I'm modifying the same migration file since I haven't pushed this code up yet.  If you're working on a team and have shared your code you'll never want to modify migration files.  They're intended to be immutable.

```elixir
    create index(:components, [:room_id, :entity_id])
    # helps look up tags
    create index(:components, [:room_id, :component_name])
    create index(:components, [:entity_id, :component_name], unique: true)
```






Now when we load the scene for a room we consistently start at the spawn_point.  You may have noticed a quick flicker of content because our camera is created at a default spot and it takes some time for us to connect to the room channel and then receive the entities snapshot data.  It then takes some more time to draw all the objects in the scene until we finally come to the spawn_point and move our camera to the new location.  


### Simple Presence

Presence is the notion of seeing each other's avatars in a shared space.  If we join a room and enter at the room's spawn_point, and there are multiple clients that have joined the room, then we should be able to look left and right and be able to "see" each other.  When we move forward, we want other people to see that movement applied to our avatar.  When we log out of a room, then other people should see our avatar disappear.  

Take a look at the message shapes below, if we were to broadcast messages like this whenever clients joined or left the room, we could use that to draw and remove an avatar based on user's attendance:

```
{event: "user_joined", payload: {user_id: "tom", position: [...], rotation: [...]}}
{event: "user_moved", payload: {user_id: "tom", position: [...], rotation: [...]}}
{event: "user_left", payload: {user_id: "tom"}}
```
I like these events because if ordered, they tell a story.  In fact, we can imagine that if we went down this path we could have more nuanced events like "user_teleported", "user_walked", "user_ran", "user_threw_object", and these sparse events could carry only the necessary data to convey an idea, and the rendering engine can take more liberty and choose how to animate or draw the data. 

Another way we could design our messages is to make all objects in the world the same.  Every message could just be a CRUD operation.  We're always creating an entity or deleting an entity or updating a component on an entity.  Events would look like this:

```
{event_type: "add_entity", payload: {entity_id: "tom", components: {position: [...]}}},
{event_type: "delete_entity"}
```

### Event Sourcing

There is an architectural pattern called Event Sourcing that treats a stream of events as the source of truth.  This stream of events can be persisted or processed in real time to transform the data into alternate forms called projections that suite different use cases.  The classic example of event sourcing is an accountant's ledger.  Each event in the ledger has a date (a timestamp), a description and whether it is a credit or debit from some account in the ledger.  With this data we can build up different projections such as, sum over all the credits and debits to come up with how much balance we have in an account. 

Our 3D scene is like a projection too.  Each connected browser can process a stream of events like the one above and any time we received "user_joined", we can draw a simple avatar at the given position and rotation.  For now we can start with a simple box.  The same principles should be applicable to more complicated avatars later.  If we get the "user_moved" message we'll just update that box's position and rotation.  Finally if we receive the "user_left" message then we delete that 3D object from the scene.

### Client vs Server Dictates Position?

You might be thinking, hey wait a minute.  The server told the front-end the spawn_point, and then we moved the camera there.  Now the client is going to tell the server where the camera is?  It's like both the server and the client are dictating the position.  Yes.  Sort of. The server will be the source of truth for providing a snapshot and broadcasting the eventstream, and each client updates the server with new events.  

So when we first join, the client doesn't know anything about the world.  It gets a snapshot that includes a spawn_point.  It then joins the room.  Next we'll want the server to tell us were we are in that room.  The client doesn't tell the server where we joined.... mmm..., because if we refresh the page, and lose all memory, or if the scene or game has changed without us, the spawn_point moved for example, then the server is the authority to tell us where we are.  So we join, then in the after join, the server will tell us where our position is as part of the snapshot.  So we need to introduce position and rotation memory for every user.




Remember we wanted events that told a story, and is sufficient information for drawing a simple avatar like this:

```javascript
{event: "user_joined", payload: {user_id: "tom", position: [...], rotation: [...]}}
{event: "user_moved", payload: {user_id: "tom", position: [...], rotation: [...]}}
{event: "user_left", payload: {user_id: "tom"}}
```

### Phoenix Presence handle_metas Callback

It turns out that we can add a callback to our `channels/presence.ex` that will get triggered everytime someone joins or leaves the room.  From that callback we could shape the kind of event that we want.  

```elixir
@doc """
  Presence is great for external clients, such as JavaScript applications,
  but it can also be used from an Elixir client process to keep track of presence changes
  as they happen on the server. This can be accomplished by implementing the optional init/1
   and handle_metas/4 callbacks on your presence module.
  """
  def init(_opts) do
    # user-land state
    {:ok, %{}}
  end

  def handle_metas("room:" <> room_id, %{joins: joins, leaves: leaves}, _presences, state) do
    for {user_id, _} <- joins do
      IO.inspect(user_id, label: "joined")

      # we don't know the user's position, so let's default to 0,0,0 for now
      XrWeb.Endpoint.broadcast!("room:#{room_id}", "user_joined", %{
        user_id: user_id,
        position: [0,0,0],
        rotation: [0,0,0,1]
      })
    end

    for {user_id, _} <- leaves do
      XrWeb.Endpoint.broadcast!("room:#{room_id}", "user_left", %{user_id: user_id})
    end

    {:ok, state}
  end
```

We're cheating a little bit, because it's not clear how we get the initial position and rotation of a connected client.  We'll come back to that later.  For now, you can test with two browsers and see if you see these new types of messages in the browser's (debug level) console when you join and leave a room.  

### Add avatar.ts

Let's add a new system file dedicated to drawing and moving the avatars at `systems/avatar.ts`.  This file will do all the things we talked about:
1. Create a box when we get "user_join"
2. Remove the box when we get "user_left"
3. Listen to camera movement and send it to the channel (when we move).
4. Receive "user_moved" data (when others move) from the channel and update the box position and rotation.

```typescript
import { config } from "../config";
import { Quaternion, TransformNode } from "@babylonjs/core";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";

const { scene, channel } = config;

let lastSyncTime = 0;
const throttleTime = 200; // ms
// when the camera moves, push data to channel but limit to every 200ms
scene.activeCamera.onViewMatrixChangedObservable.add(cam => {
  console.log("camera moved");
  if (Date.now() - lastSyncTime > throttleTime) {
    config.channel.push("i_moved", {
      position: cam.position.asArray(),
      rotation: cam.absoluteRotation.asArray(),
    });
    lastSyncTime = Date.now();
  }
});


channel.on("user_joined", (payload: { user_id: string, position: number[], rotation: number[]; }) => {
  console.log("user_joined", payload);
  createSimpleUser(payload.user_id, payload.position, payload.rotation);
});

channel.on("user_left", (payload: { user_id: string; }) => {
  console.log("user_left", payload);
  removeUser(payload.user_id);
});

channel.on("user_moved", (payload: { user_id: string, position: number[], rotation: number[]; }) => {
  console.log("user_moved", payload);
  poseUser(payload.user_id, payload.position, payload.rotation);
});


const removeUser = (user_id: string) => {
  const user = scene.getTransformNodeByName(user_id);
  if (user) {
    user.dispose();
  }
};

const createSimpleUser = (user_id: string, position: number[], rotation: number[]) => {
  if (user_id !== config.user_id) {
    const user = scene.getTransformNodeByName(user_id);
    if (!user) {
      const transform = new TransformNode(user_id, scene);
      const box = CreateBox("head");
      box.parent = transform;
      poseUser(user_id, position, rotation);
    }
  }
};

const poseUser = (user_id: string, position: number[], rotation: number[]) => {
  const transform = scene.getTransformNodeByName(user_id);
  if (transform) {
    transform.position.fromArray(position);
    if (!transform.rotationQuaternion) { 
      transform.rotationQuaternion = Quaternion.FromArray(rotation); 
    } else {
      transform.rotationQuaternion.x = rotation[0];
      transform.rotationQuaternion.y = rotation[1];
      transform.rotationQuaternion.z = rotation[2];
      transform.rotationQuaternion.w = rotation[3];
    }
  }
};
```
Remember to add `import "./systems/avatar";` to `rooms.ts` in order to import the new system.

We're sending a new message to the room channel "i_moved" whenever the camera moves.  We need to handle that and transform it to the event we want.  We're doing a bit of throttling just so we don't slam the server with every tiny bit of movement.  5 times a second should be plenty.

Add this handler in `room_channel.ex` and broadcast this message to everyone but ourselves as "user_moved":

```elixir
  @impl true
  def handle_in("i_moved", %{"position" => position, "rotation" => rotation}, socket) do
    broadcast_from(socket, "user_moved", %{
      user_id: socket.assigns.user_id,
      position: position,
      rotation: rotation
    })

    {:noreply, socket}
  end

```
The handler pattern matches the incoming message "i_moved", then broadcasts to all other connected clients a message of event type "user_moved".

Open two browsers windows and try moving around the space with your cursor keys in each window and see if you can see the box of the other avatar.  If you only see a box in one window and not the other, you may have encountered the issue I talked about earlier.  One of the browsers, the one that joins much later may miss the "user_joined" message generated for the first browser and therefore doesn't draw its box.

The room channel could send down a list of all users with positions and rotations if it kept this data.  The Phoenix Presence is already tracking user_ids.  We  need to save positions and rotations somewhere too.

### Users Snapshot

We can create a serverside snapshot of where every user is in 3D space.  Then whenever a user joins or rejoins we push the snapshot down to the client so they can draw any previously joined users.

We can make a map of users like so:

```elixir
users = %{}
```

Then whenever a user moves we'll just store the last known position and rotation into the map like this:

```elixir
%{"tom" => %{"position" => [...], "rotation" => [...]}}
```

We can't create this map inside the `RoomChannel` because each connected client gets their own independent `RoomChannel` process.  We need to store this map somewhere else, some place that is listening to events happening for a room from the very beginning.  We could use a proper database like mysql or postgres but the round trip to a external database is slow and expensive for the amount of frequent user movement we will be getting.  Let's just store it in memory.

Elixir has this really nifty way of creating a tiny server called a GenServer.  Let's create one now to wrap our users snapshot.  Create a folder `servers` and file at `lib/xr/servers/user_snapshot.ex`

```elixir
defmodule Xr.Servers.UserSnapshot do
  use GenServer

  def start_link() do
    GenServer.start_link(__MODULE__, [])
  end

  def init([]) do
    {:ok, %{users: %{}}}
  end
end
```

This boiler plate just uses the GenServer behavior and allows us to create a genserver with an initial state of an empty users map.

Try this out in the elixir iex terminal, (Since I run `iex -S mix phx.server` I always have one running in my vscode terminal window):

```elixir
{:ok, pid } = Xr.Servers.UserSnapshot.start_link()
iex> pid
#PID<0.1742.0>
iex> :sys.get_state(pid)
%{users: %{}}
```

We get a pid, a process id for our server, and we can inspect the state inside that pid.

Next we need our server to be able to react to "user_moved" etc to store the user position and rotation in the map.  The genserver has two kinds of APIs, one for dealing with calling GenServer functions to passing a message to the pid that is the genserver, and a set of handlers for reacting to receiving the messages inside the GenServer.  Add these lines to the `user_snapshot.ex` file:

```elixir
  def user_moved(pid, payload) do
    GenServer.cast(pid, {:user_moved, payload})
  end

  @impl true
  def handle_cast(
        {:user_moved, %{"user_id" => user_id, "position" => position, "rotation" => rotation}},
        state
      ) do
    {:noreply,
     %{
       state
       | users: Map.put(state.users, user_id, %{"position" => position, "rotation" => rotation})
     }}
  end
```
You can test this in iex (you'll need to get a new pid after recompiling the changes):

```elixir
Xr.Servers.UserSnapshot.user_moved(pid, %{"user_id" => "tom", "position" => [1,2,3], "rotation" => [45,65,66,1]})
:ok
iex> :sys.get_state(pid)
%{users: %{"tom" => %{"position" => [1, 2, 3], "rotation" => [45, 65, 66, 1]}}}
```

Now we need to start this GenServer whenever someone visits the room URL and we need a way to know what the pid is from other parts of the code.


<!-- 
### Share user movement

Now for sharing our camera movement data.  The boiler plate `scene.ts` code we added earlier already hooks up basic mouse and cursor keys.  If you press your up, left, right, down arrows keys your POV will change.  We want to take the new camera position and rotation and push it to the room channel.

Let's a camera listener to `system/avatar.ts`:

```typescript

const { scene } = config;

let lastSyncTime = 0;
const throttleTime = 200; // ms
// when the camera moves, push data to channel but limit to every 200ms
scene.activeCamera.onViewMatrixChangedObservable.add(cam => {
  if (Date.now() - lastSyncTime < throttleTime) return;
  config.channel.push("i_moved", {
    position: cam.position.asArray(),
    rotation: cam.absoluteRotation.asArray(),
  });
  lastSyncTime = Date.now();
});

```


To see this message in the browser javascript console, add this in our `avatar.ts` file:

```typescript
config.channel.on("user_moved", (payload: { user_id: string, position: number[], rotation: number[]; }) => {
  console.log("user_moved", payload);
});
```

Now we should be getting the event shapes that we wanted.  Test it out!




To properly subscribe for these messages we would use something like this:

```typescript
channel.on("presence_state", payload => { 
    // for each user_id in payload
    // check if box named user_id exists
    // if not exists, create it
 })
channel.on("presence_diff", payload => { 
   // for each user_id in payload.joins
   // create box if not exists
   // for each user_id in payload.leaves
   // delete box if exists
 })
```

There is no guaranteed order in which we get these messages, so our code should not depend on order.  

This seems like a reasonable first approach to making a simple "avatar" presence.  Let's add a new system file at `assets/js/systems/presence.ts` in order to handle this feature.  That way we aren't polluting the `broker.ts` file with graphics and other logic.  In fact, I named the `broker` system after the fact that I wanted it to be simply responsible for forwarding messages between the channel.

How then will the `presence` system receive messages from `broker`?

## Sharing messages between services

The channel object already implements a way to decouple the code using a publish/subscribe pattern.  If we shared the `channel` object in our `config` object, then any system can self subscribe using `config.channel.on("my_event")` etc and write a handler for the event.  However, before we go down that road, if we're going to fully embrace event-based programming, then I think we should standardize on RxJS as our API for all events.

### Adding RXJS

RxJS is (from their website) a library for composing asynchronous and event-based programs by using observable sequences.  This is a fancy way of saying that not only can we do regular pub/sub of events, we can transform and combine and filter events into new events that can also be subscribed to.  This will come in handy when we need to combine multiple events to figure out new gestures, such as determining when a user is trying to grab something.

The main api we will be using from rxjs is `Subject`.  We can define the shape of messages that will pass through it like this:

```
let my_bus: Subject<{my_shape: string, whatever: number}>
```

Put whatever type you want between the `< >`.  Then to push new values into the event bus you use the `next()` method.  And to subscribe to messages use the `subscribe()` method.

RxJS then provides a bunch of useful ways to combine, throttle, transform events from multiple streams of data.  I often reference https://rxmarbles.com/ to visualize how the data flows.

Let's install rxjs from our `assets` directory:

```bash
npm i rxjs
```

Extend the config object like so in `config.ts`:

```typescript
import { Subject } from "rxjs"

export type Config = {
  ...
  $presence_state: Subject<{[user_id: string]: any }>
  $presence_diff: Subject<{joins: {[user_id: string]: any }, leaves: {[user_id: string]: any }}>
}

export const config: Config = {
  ...
  $presence_state: new Subject<{[user_id: string]: any }>(),
  $presence_diff: new Subject<{joins: {[user_id: string]: any }, leaves: {[user_id: string]: any }}>
}
```

In `broker.ts` we can forward the channel subscriptions into the new rxjs Subjects we created.

```typescript
channel.on("presence_state", (payload) => {
  config.$presence_state.next(payload);
});

channel.on("presence_diff", (payload) => {
  config.$presence_diff.next(payload);
});
```
Now let's create the new presence system that will subscribe to the events and create our boxes.

```typescript
import { config } from "../config";
import { TransformNode } from "@babylonjs/core";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";

const { scene } = config;

config.$presence_state.subscribe((payload) => {
  for (const user_id in payload) {
    createSimpleUser(user_id);
  }
});

config.$presence_diff.subscribe((payload) => {
  for (const user_id in payload.joins) {
    createSimpleUser(user_id);
  }
  for (const user_id in payload.leaves) {
    removeUser(user_id);
  }
});

const removeUser = (user_id: string) => {
  const user = scene.getTransformNodeByName(user_id);
  if (user) {
    user.dispose();
  }
};

const createSimpleUser = (user_id: string) => {
  if (user_id !== config.user_id) {
    const user = scene.getTransformNodeByName(user_id);
    if (!user) {
      const transform = new TransformNode(user_id, scene);
      const box = CreateBox("head");
      box.parent = transform;
    }
  }
};

```

Now if you navigate to a specific room URL in two browser windows you should see a box appear at the origin when there is a second client connected to the room.  And the box should disappear when all other clients have disconnected.  

We have a slight problem though, we're not specifying where the box should be drawn so by default it's drawn at the origin.  Our own camera is not even at the origin, so we're not drawing the boxes at the location where our camera currently is in the shared space.  What we want is to draw the box at our camera position and if we move our camera the box that represents us should move to the new position.

## Sharing Position and Movement

Right now when we load a room URL, we immediately create the scene and add a camera in the `scene.ts` system.  Every browser that loads that same room URL creates a camera at exactly the same location so we're all on-top of each other!  Each user would not be able to see each other because we are all looking out the same way.

Multiplayer games solve this problem by using a spawn_point.  A spawn_point has a position in 3D space, usually located on the ground of some surface.  Then when a user joins the room, we spawn the user near the spawn_point with some randomness in position and maybe orientation too.  That way when multiple users join the room at the same time they're not as likely to be intersecting with each other.  Let's put a pin in that idea for now, we'll come back to this spawn_point concept later.  For now, let's assume that our default scene has a spawn_point a the origin (0,0,0).

In `scene.ts`, when we create our camera, we could initialize it in a slightly random position around the origin. 

```typescript
// create a random position around the origin
const random_position = new Vector3(Math.random() * 10 - 5, 2, Math.random() * 10 - 5);
const camera = new FreeCamera("my head", random_position, scene);
```

Then we can listen for any camera movement and then push that data into an RxJS Subject in order to decide what to do with it somewhere else.
```typescript
// when the camera moves, push data to eventbus
camera.onViewMatrixChangedObservable.add(cam => {
  config.$camera_moved.next([cam.position, cam.absoluteRotation])
})
```

Let's define that new RxJS Subject on `config.ts`:
```typescript
export const config: Config = {
  ...
  $camera_moved: new Subject<[Vector3, Quaternion]>(),
}
```

Since `broker.ts` is responsible for talking to the server through the channel, we'll have broker.ts subscribe and push the data to the server:

```typescript
// forward my camera movement to the room
// not more frequently then every 200ms
config.$camera_moved
  .pipe(throttleTime(200))
  .subscribe(([position, rotation]) => {
    channel.push("i_moved", { position: position.asArray(), rotation: rotation.asArray() });
  });
```
Here we start to see some convenient operators of RxJS.  When wearing a VR headset the VR camera rig is moving constantly even if you hold your head very still.  We will produce a message every single frame unless we throttle the data we're sending out.  I've decided that we don't need that level of resolution for imperceivable motion.  Using RxJS pipes we can transform the stream of data that is happening at 60fps to just 5 times a second using throttleTime 200 ms.  Since the Babylon.js camera position and absoluteRotation properties are actually rich objects that have many methods, we don't want to send that over to the channel because it's too complex.  Instead we convert the data to arrays of numbers because that's much less complicated to send.

Next we need to do something with that message on the server side.  Let's add a handler for "i_moved", but for now just broadcast it to everyone else but ourselves (the sender).

```elixir
def handle_in("i_moved", %{"position" => position, "rotation" => rotation}, socket) do
  broadcast_from(socket, "user_moved", %{
    user_id: socket.assigns.user_id,
    position: position,
    rotation: rotation
  })

  {:noreply, socket}
end
```
Next we need to add some channel code to receive the new "user_moved" message broadcast from the server to inform us of the movement of any other person that is moving.

```typescript
// receive other users movements from the server
channel.on("user_moved", (payload) => {
  config.$user_moved.next(payload)
})
```

Again let's add the new RxJS Subject we just defined in `config.ts`:
```typescript
  ...
  $user_moved: new Subject<{user_id: string, position: number[], rotation: number[]}>(),
```

hhhhhmmm... do we really need rxjs for all these one use messages?  Maybe you can inject rxjs for throttling once you make a subscription.

make common code to make Observable from babylon observable.  make rxjs observable from a channel subscription as well.

This handler pattern matches the incoming message on the "i_moved" event as well as the contents of the message having to contain the keys position and rotation and destructures them into variables all in one line.  We then simply use the broadcast_from API to send a new message "user_moved" to all other clients connected to this room.  The message we send forwards the position and rotation data and enhances the payload with the user_id.

But when other clients join the room and render our box, how will they know that position?  When a client joins the room they will get a phoenix_state message that informs us all the user_ids that are in the room, but that message doesn't contain position data.  

We can join the channel and push down some initial position to the server.  Phoenix presence tracking could theoretically keep that position as some metadata.  However, since players move around a lot, and Phoenix presence data is replicated across all nodes, I feel like that is too chatty to place data that is changing all the time in metadata.  Instead we need some kind of database to store rapidly changing data and be able to query all users positions when clients join. -->

### Testing Multiplayer Without Deploying

 ngrok
 
 ssh -R 80:localhost:4000 serveo.net


## Assets, Interactables, Non-player Related Items

## Persistence of Scene State

## Adding WebRTC

### Adding Agora

### Spatial Voice Audio

## Enabling Immersive VR Mode

### Sharing Hand Movement

### Grab and Throw objects

## Making VR GUIs

## Deployment

## Optimizations

### Truncate precision in position and rotation

### Eliminate duplicate or nearly identical position or rotation messages

### Batch send all messages every 200 ms.

### Group all movement data from the server into 200 ms batches.

### Shorten the UUIDs in room and user

### Use pids instead of registry

## Scaling

### Replacing Registry with Syn


