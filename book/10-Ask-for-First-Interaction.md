## Ask for User First Interaction

Instead of immediately connecting to the room channel as soon as the page loads, let's pop up a modal to ask the user if they want to "enter" the room in the first place.  This sets up the ability to do some gating later.  We can't stop browsers from loading a public webpage if they know the meeting room_id, but we can prevent them from entering the event if they are unauthorized, don't have a password or invite, etc.  This means we don't waste channel resources and don't connect them to the room until they are qualified.  An even more important benefit is that we get our "first user interaction" out of the way.  This initial interaction (a click) is required in order to unblock us from using some browser APIs, such as checking what audio devices they have like microphone etc. 

Let's modify the room controller's `show.html.heex` page to drop in a Phoenix liveview so we can create some dynamic HTML over our scene.

```elixir
<script>
  window["room_vars"] = <%= raw Jason.encode!(%{room_id: @room.id, user_id: @user_id, entities: @entities}) %>
</script>
<body>
  <style>
    html, body {
      overflow: hidden;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: radial-gradient(ellipse at top, #201111, transparent),
              radial-gradient(ellipse at bottom, #000021, transparent);
    }
  </style>
  <%= live_render(@conn, XrWeb.RoomMenu.Index, session: %{"room_id" => @room.id}) %>
</body>

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
There is a bit to unpack here.  This very simple model is styled with tailwind classes to appear ontop of everything.  The meaty part here is the phx-click attribute:

```elixir
JS.hide(to: "#room_modal")
  |> JS.dispatch("live_to_xr", detail: %{"event" => "enter_room"}) 
```
This is a pipe of two elixir functions that actually become javascript functions.

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
    console.log("live_to_xr", e);
    if (e["detail"]["event"] == "enter_room") {

      channel
        .join()
        .receive("ok", (resp) => {
          console.log("Joined successfully", resp);
          config.$channel_joined.next(true);
        })
        .receive("error", (resp) => {
          console.log("Unable to join", resp);
          // redirect to index page so they can start over
          window.location.href = "/rooms";

        });

    }

  });
```

This is the same channel joining code we had before, just now wrapped in an event listener to the "live_to_xr" event.  We can also hide the model after the click without involving a round trip to the server by just using `JS.hide(to: "#room_modal")` which is piped inside the `phx-click`.

You may have noticed that when we dismiss the model and immediately try to move forward or backward with the cursor keys, we can't.  And this is because the canvas does not have the focus so Babylon.js isn't receiving any keyboard input events.  We have to use the mouse to click on the canvas first before we can move the camera with the keyboard.  We fix this by programmatically setting the focus on the canvas:

```typescript
canvas.focus()
```

However this was previously impossible because we needed a user's first interaction.  Now we have it.  Let's open up `scene.ts` system and in the `init` function add a listener for when the room is joined to set the focus.

```typescript
  config.$channel_joined.subscribe(() => {
    canvas.focus();
  });
```
Now after we dismiss the modal the camera will respond to keyboard cursor presses.


### Summary

With these changes we have implemented a click-to-join type of model.  Instead of joining the channel as soon as possible, we're only joining once the enter room button was clicked.  This satisfies the browser's requirement for a "first interaction" which will unlock API's such as asking user permission for immersive-vr, and enable microphone.

