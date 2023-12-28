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
  - [Why not use off the shelf VR as a Service?](#why-not-use-off-the-shelf-vr-as-a-service)
- [Preparing your development workstation](#preparing-your-development-workstation)
  - [Install Elixir](#install-elixir)
  - [Add a variable in your shell profile to preserve iex history.](#add-a-variable-in-your-shell-profile-to-preserve-iex-history)
  - [Install docker and docker-compose.](#install-docker-and-docker-compose)
  - [Install vscode.](#install-vscode)
  - [Install Phoenix](#install-phoenix)
  - [Create Your Project Directory](#create-your-project-directory)
  - [Create a Postgres Database Server](#create-a-postgres-database-server)
  - [Summary](#summary)
- [Creating rooms](#creating-rooms)
  - [Replace the default Phoenix landing page](#replace-the-default-phoenix-landing-page)
  - [Remove the Default Heading](#remove-the-default-heading)
  - [Enable Room Specific Communication](#enable-room-specific-communication)
    - [Here's some basic concepts:](#heres-some-basic-concepts)
    - [Create a User Socket](#create-a-user-socket)
    - [Create a Room Channel](#create-a-room-channel)
    - [Let UserSocket Know About RoomChannel](#let-usersocket-know-about-roomchannel)
    - [Modify RoomChannel Join function](#modify-roomchannel-join-function)
    - [Sharing the liveview socket](#sharing-the-liveview-socket)
    - [Join the Room Channel](#join-the-room-channel)
    - [Conditionally Join Channel When We're In a Room](#conditionally-join-channel-when-were-in-a-room)
    - [Send and Receive a Test Message](#send-and-receive-a-test-message)
  - [Securing the WebSocket](#securing-the-websocket)
    - [Creating a unique id per visitor](#creating-a-unique-id-per-visitor)
  - [Adding Babylon.js](#adding-babylonjs)
    - [Configuring Esbuild to use npm](#configuring-esbuild-to-use-npm)
  - [Creating two esbuild targets](#creating-two-esbuild-targets)
  - [Creating two Phoenix Layouts](#creating-two-phoenix-layouts)
- [Enabling Immersive VR Mode](#enabling-immersive-vr-mode)
- [Using RXJS](#using-rxjs)
- [Adding WebRTC](#adding-webrtc)
  - [Adding Agora](#adding-agora)
  - [Spatial Voice Audio](#spatial-voice-audio)


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
erl -s erlang halt
Erlang/OTP 26 [erts-14.2] [source] [64-bit] [smp:32:32] [ds:32:32:10] [async-threads:1] [jit:ns]

elixir -v
Erlang/OTP 26 [erts-14.2] [source] [64-bit] [smp:32:32] [ds:32:32:10] [async-threads:1] [jit:ns]

Elixir 1.15.7 (compiled with Erlang/OTP 26)
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
I'm using Phoenix 1.7.10.  You should use the same versions as I am using if you want to follow along.  I assume the code generators will produce the same code for you as it does for me.

## Create Your Project Directory
An empty Phoenix project will serve as the home for all of our code.  We'll start with a self-sufficient monolith, and only reach for other technologies when the need arises.

We'll use the mix phx.new generator to create a new project for us.  By default phoenix will come with a postgres database configuration.  I recommend setting the option for binary id, which will make any table we generate use uuid for the id column instead of incrementing integers.  This makes ids for users and rooms random, which is good for making them hard to guess and hard for people to guess how many rooms and users you have in total, as well as making it easier in the future to copy records from one database shard to another shard because you don't have to worry about id conflicts.

The command below will create a project folder for us.  I named my project xr, but you can call it whatever you want.

```bash
 mix phx.new xr --binary-id
```

Ignore the lengthly output for just a moment.  We'll need to make sure Phoenix has access to a Postgres database before we can proceed with the instructions it output.

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


Assuming you have docker and docker-compose or docker desktop already installed, run `docker-compose up -d`.  This will download the postgres image from dockerhub and initialize it with the default user and password.

Check that the database image container is running with `docker ps`

Now you can run the rest of the project instructions:

```bash
mix ecto.create
```

This will create a development database (a logical database) within your docker postgres database container.  

Then start your server using `iex -S mix phx.server`

If you're on linux you may also get an error about needing `inotify-tools`, in which case follow the links to install that for live-reload.

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

Now it looks a little better.  I am not a CSS guru, but they say the utility classes that ship with tailwind help folks to learn CSS even better.  Whatevs, I'm hoping Google or ChatGPT or Codeium (vscode plugin for AI completion) can help me write tailwind.

For now let's at least have a basic link on our homepage link over to our rooms index page so that we can pick a room and jump into it:

```elixir
<.link href={~p"/rooms"} class="underline text-blue-700 p-2">Rooms</.link>
```

That strange looking `.link` thing looks like an HTML tag but it's actually a Phoenix live view component.  That just means that it's a function named `link` that handles various kinds of navigation for us including clever push-state transitions that don't actually reload the page.  We don't really need to use it for this simple page transition since we're just using href which is a full page reload.  The next funky bit is the href value.  That is using a special ~p sigil which will raise a warning (vscode should underline in yellow) if we link to a non-existant path.

## Remove the Default Heading

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

## Enable Room Specific Communication

Now that we have a landing page for a particular room at `/rooms/some-room-id-randomly-generated` let's see if we can send a message from that room, and in another browser, if also connected to the same room, be able to receive that message.

We don't have much of a UI in our room yet, but don't worry we don't need it yet.  Let's just get the backend mechanics set up so we can send and receive messages.

### Here's some basic concepts:

In javascript land we're going to connect to a web socket at an address hosted by the server.  

```
clientA -> connect to -> Server Socket
```

When we connect to the socket we send some initial data from the front-end so the server can authenicate us (we wouldn't want just anybody to be able to connect to our server, right?).  We're also going to join a channel which is "made" from the socket.  

```
clientA -> join -> Channel
clientB -> connect to -> Server Socket
clientB -> join -> Channel
```

A channel is basically an event machine.  In Elixir it's a process for each connected client.  It's some mechanism that listens to messages directed at a specific "topic" and does something.

```
clientA -> push message -> Channel
clientB -> push message -> Channel
```

Depending on the message, it can decide to update its state and either reply or maybe not reply.  The javascript side is nearly a mirror of this setup.  The javascript client joins a channel and can subscribe or listen to messages that come from the server and also push messages to the channel, so it's a two way street.

The really cool part is that Channels also include apis for broadcasting to all clients connected to the channel.  So if there are multiple browsers connected to the same room, they all get a copy of the message.  And this happens easily do to Phoenix PubSub which can forward messages between channels (which are Elixir processes) just as easily on distributed machines as it can on one machine.  Of course you can call any kind of code you want to in the Channel, but mainly we'll be using it to sync messages between our connected players in our meeting rooms.

```
clientB <- receives message from client A <- Broadcasted message from the Channel
```

### Create a User Socket

Ok, enough theory let's create this socket thing.  Fortunately phoenix includes a generator for that too.  Run this command in your terminal in your projects root folder but don't follow the instructions it spits out in the terminal.  We'll be doing something slightly different since we already have a liveview socket so we can piggy back on.  In other words the generator created a new js client and wants us to add a new endpoint, however we can just share the liveview socket that so that our front-end client doesn't need to join two different sockets.

```bash
mix phx.gen.socket User
```
This creates two files.  

```bash
* creating lib/xr_web/channels/user_socket.ex
* creating assets/js/user_socket.js
```
We're going to merge the javascript code in `user_socket.js` into `app.js` in moment.  Right now app.js is our only entry point.  It's the only file that is included in our layout.  We'll go back and clean all this javascript up in a later chapter I promise.  For right now let's get a quick win by demonstrating we can send messages between clients.

### Create a Room Channel

But first, we need to create a room channel.  And wouldn't you know it, there's a generator for that too.  Run this in the terminal as well.

```bash
mix phx.gen.channel Room
```
The autogenerated code in the user_socket.ex and room_channel.ex are 90% there, we just need to make a few tweaks.

### Let UserSocket Know About RoomChannel

Open `lib/xr_web/channels/user_socket.ex` and add this line:

```elixir
  channel "room:*", XrWeb.RoomChannel
```
In fact, that line might be there already, just uncomment it.  This "room:*" means that the `RoomChannel` module will spawn new processes whenever a client joins a channel with the topic starting with "room:" e.g. "room:42".

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

Notice the pattern "room:lobby".  This means this room channel can only handle one specific meeting room, the lobby.  We want to handle arbitrary meeting room ids.  We want to change it to look like this:


```elixir
  def join("room:" <> room_id, payload, socket) do
    IO.inspect(room_id, label: "room_id")
    if authorized?(payload) do
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end
```
Every new room id will launch a new process for every connected client.

This `"room:" <> room_id` means we are pattern matching on a string that starts with "room:" followed by a variable that will match the rest of the string.  

Here's an example of this kind of pattern matching happening for "=" operator.

```elixir
iex(1)> "room:" <> room_id = "room:42"
"room:42"
iex(2)> room_id
"42"
```

The same kind of pattern matching is applied to function heads like `join` and in this case we're storing `room_id` then printing it out for fun in the `IO.inspect` part.

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

Now we'll merge parts of `user_socket.js` into `app.js`

I copied this portion from `user_socket.js` and pasted it into `app.js` right after the `liveSocket.connect()` line, and changed the `socket` variable to `liveSocket`.

```javascript
let channel = liveSocket.channel("room:42", {})
channel.join()
  .receive("ok", resp => { console.log("Joined successfully", resp) })
  .receive("error", resp => { console.log("Unable to join", resp) })
```

This code will only ever try to connect to meeting room "42" because it was hardcoded that way.  Let's change that.

### Conditionally Join Channel When We're In a Room

Since our CRUDy room paths follow certain path conventions, e.g. `rooms/:room_id`, when we are navigated to a specific room, we can extract the room id from the browser URL path and pass that as the channel name we want to join, if and only if we detect that pattern in the URL.

```javascript
// Get the current URL path
let current_path = window.location.pathname;

// Define a regular expression pattern to match the UUID part
let room_id_pattern = /^\/rooms\/([^\/]+)$/;

// Use the pattern to extract the UUID
let matches = current_path.match(room_id_pattern);

// Check if there is a match and get the UUID
if (matches && matches.length > 1) {
    let room_id = matches[1];
    let channel = liveSocket.channel(`room:${room_id}`, {})
channel.join()
  .receive("ok", resp => { console.log("Joined successfully", resp) })
  .receive("error", resp => { console.log("Unable to join", resp) })

} else {
    console.log("UUID not found in the path.");
}
```

Since this code we added to `app.js` is only evaluated once during a full page load, it will not execute when LiveView uses it's clever push state navigation from `/rooms` to `/rooms/:my_room_id` because it only loads the parts of pages that change.

We can see LiveView links at play by opening up the template `lib/xr_web/liv/room_live/index.html.heex` that renders a list of rooms.

```html
<:action :let={{_id, room}}>
  <div class="sr-only">
    <.link navigate={~p"/rooms/#{room}"}>Show</.link>
  </div>
  <.link patch={~p"/rooms/#{room}/edit"}>Edit</.link>
</:action>
```

Change `navigate` to `href` and we'll get the regular full page load behavior.  Also remove the `<div class="sr-only">` tags because that hides the link, and we want it to show so we can click on the "Show" link.  And finally remove the line `row_click={fn {_id, room} -> JS.navigate(~p"/rooms/#{room}") end}` on the `<.table>` component itself because it causes any click anywhere on the row to also use a push state navigation.  You should end up with a table like this:

```html
<.table id="rooms" rows={@streams.rooms}>
  <:col :let={{_id, room}} label="Name"><%= room.name %></:col>
  <:col :let={{_id, room}} label="Description"><%= room.description %></:col>
  <:action :let={{_id, room}}>
    <.link href={~p"/rooms/#{room}"}>Show</.link>

    <.link patch={~p"/rooms/#{room}/edit"}>Edit</.link>
  </:action>
  ...
```

If you now navigate to any room you previously created and inspect the browser's console logs you should see:

```
Joined Successfully
```

Congrats!  That was a lot of stuff, but we now have our front-end connected over web sockets and a room channel all the way to the backend!  We're ready to send and receive messages!

### Send and Receive a Test Message

We don't have a pretty UI or even buttons we can press to send any messages.  We're going to cheat a little bit and make a dirty little test so we can be satisfied at our progress.  In `app.js` where we just created the channel, go ahead an assign it to the window object.  This will allow us to access the channel from the browsers console.

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

At this point we've proven that we can send messages back and forth from one browser to another.  We've sort of played it fast and loose so let's go back and tidy a few things up.  Phoenix provides a way of doing authentication in the `UserSocket`.  You may have noticed code snippets in the code generated in `user_socket.js` that tells us what to add.  The basic idea is that our backend will send a bit of encrypted data to the front-end such as the user's id.  And when we connect to the socket from the front-end we'll send that encrypted data back to the server.  In the `UserSocket` module we'll then unencrypt the data, retrieving the user_id and sticking it into the socket so that it's available in the `RoomChannel`.  But first we'll need a user_id.

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

This function takes a conn (some kind of connection struct), and some options that we don't care about.  Then creates a new conn that adds a user_id into the cookie session, but only if it wasn't there already.

We'll add this plug into the browser pipeline:

```elixir
pipeline :browser do
  plug :accepts, ["html"]
  ...
  #add it at the end
  plug :maybe_assign_user_id
end
```

Now every visitor to the website will get a unique user_id in the session that will persist unless they clear their cookies and they haven't had to login or register.

Let's add another plug in `router.ex` for creating an encrypted token from the user_id

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

Again, add this plug in the browser pipeline:

```elixir
pipeline :browser do
  plug :accepts, ["html"]
  ...
  #add it at the end
  plug :maybe_assign_user_id
  plug :put_user_token
end
```

Now we need to pass this token to JavaScript. We could add a snippet of javascript to set the token on the window object, but I'm paranoid that the evaluation order of script tags makes this vulnerable to race conditions.  I'll side step the paranoia by just injecting the token into the HTML at `root.html.heex` layout.  This is also what Phoenix itself does with the csrf_token.

```html
<meta name="user-token" content={assigns[:user_token]} />
```

Then when we make the liveSocket in `app.js` let's grab it and pass it in the `LiveSocket` constructor options.  Again this is following what Phoenix does with the csrf_token.  Your `liveSocket` should look like this:

```javascript
let userToken = document
  .querySelector("meta[name='user-token']")
  .getAttribute("content");

let liveSocket = new LiveSocket("/live", Socket, {params: {_csrf_token: csrfToken, _user_token: userToken}});
```

Now we open up `user_socket.ex` and replace the default `connect` function with this snippet that will verify the user token:

```elixir
def connect(%{"_user_token" => token}, socket, _connect_info) do
  case Phoenix.Token.verify(socket, "some salt", token, max_age: 1_209_600) do
    {:ok, user_id} ->
      {:ok, assign(socket, user_id: user_id)}

    {:error, _reason} ->
      :error
  end
end
```

Since the socket is assigned the user_id, we should now be able to access the user_id from the `RoomChannel`.

Open up `room_channel.ex` and modify `join` function to be like this:

```elixir
  def join("room:" <> room_id, _payload, socket) do
    send(self(), :after_join)
    {:ok, assign(socket, :room_id, room_id)}
  end
```
The `join` function, on a successful operation should return a tuple with `{:ok, socket}`.  Here we are adding the room_id into the socket so we have some memory to use in other handlers.  `user_id` is already in the socket assigns thanks to the `UserSocket` putting it in there (we did that!).

This `send` function is a built in function that will send a message to any process.  In this case we're sending a message to ourselves right after we've joined.  Once we've joined, (and not before) we can utilize the channel APIs like push, broadcast etc.  We need to add a new handler to handle the `:after_join` message.

```elixir

  @impl true
  def handle_info(:after_join, socket) do
    broadcast(socket, "shout", %{user_id: socket.assigns.user_id, joined: socket.assigns.room_id})
    {:noreply, socket}
  end
```
We're broadcasting to all the connected clients of this room that a new user has joined and printing out the user_id and the room_id.  Since our javascript code is already console.log-ing anytime the server is pushing down a message of event "shout", we can see this at play in the browser's console.  To test this, open up multiple browser windows, navigate to a specific room and view the console.logs.  To see a different user_id, one of your browsers can use Incognito mode, or use a different browser on your machine.  This is because the session user_id is tied to the cookie which is shared among tabs and windows of the same browser and domain.  

## Adding Babylon.js


### Configuring Esbuild to use npm

Phoenix comes with a wrapped version of esbuild with some tucked away defaults.  We're going to want to remove that so that we can customize our esbuild configuration.  That way we can load dependencies with package.json and import them into our own typescript code, and then we'll want to ignore some external dependencies so that they aren't bundled into our javascript artifact.  I prefer to download Babylon.js from their CDN.  These libraries don't change as often as our own code and therefore in prod, when we push out changes only our javascript changes would be downloaded and the user would likely already have a cached version of the CDN.

Esbuild will by default produce a bundle of javascript that is a single file wrapped in an immediately invoked function expression so that its internal variables cannot be accessed from the world outside.  Since we'll have other pages that do not need to contain code pertaining to 3D and Babylon, we can create two bundles.  One for immersive VR, and one for everything else.

## Creating two esbuild targets


## Creating two Phoenix Layouts

We'll also create two Phoenix layouts.  One to hold all the cdns of babylonjs dependencies as well as the alternate esbuild bundle.  And one for our lightweight version of our bundle.

Create the engine

Create the camera

Create the lighting

Create the scene

Create a box

# Enabling Immersive VR Mode

# Using RXJS

# Adding WebRTC

## Adding Agora

## Spatial Voice Audio







