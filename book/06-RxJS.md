
## Adding RxJS

There is one more important library that I think is super useful for sharing realtime data between our systems and that is RxJS.  RxJS is "a library for composing asynchronous and event-based programs by using observable sequences".  This is a fancy way of saying that not only can we do regular pub/sub of events, we can do tricky things such as wait for one event to happen first before doing something else, or wait for two different events to have happened before triggering a behavior, or making  sure something happens just once, etc.  It's very powerful and often has a cleaner more declarative API compared to more imperative loops that have more temp variables hanging around.

RxJS makes it easier to work with events.  The classic example is imagine that you need to implement drag-and-drop.  How would you do it?

In an imperative style you would create a variable for isMouseDown.  We need to listen to mouse down and then set isMouseDown to true.  And we also need to know if we clicked on a draggable object.  So we can set another variable for clickedOnDraggable.  And then listen to mouse move.  And then inside the mouse move event update the object you are dragging to where the mouse is, but only do that if isMouseDown is true and clickedOnDraggable is true.  Suffice to say, that it gets complicated with all these side-variables in the way.  

The RxJS way of doing drag and drop is that mouseDown and mouseUp and mouseMove are all signals.  Using RxJS you can start with mouseDown and only in that context listen for mouse move and do some update work until we get a mouseUp event, in which case the mouseMove and mouseUp listeners are cleanly unsubscribed.

It's a bit much to explain here, here are some links to read up on and play with:

https://rxjs.dev/guide/overview

## Using RXJS for events

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

## Summary

In this chapter we barely scratched the surface of RxJS but since we're going to be having data streamed to the front-end from the server soon, now's a good time to introduce RxJS Subject.  We installed the library and extended the `Config` type to add some RxJS subjects, my convention is to prefix with `$` in the name so we know it's a stream.