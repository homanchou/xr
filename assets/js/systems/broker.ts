import { throttleTime } from "rxjs";
import { config } from "../config";

// channel connection
const socket = config.socket;
socket.connect();
let channel = socket.channel(`room:${config.room_id}`, {});
config.channel = channel;

channel
  .join()
  .receive("ok", (resp) => {
    console.log("Joined successfully", resp);
  })
  .receive("error", (resp) => {
    console.log("Unable to join", resp);
  });

channel.on("shout", (payload) => {
  console.log("I received a 'shout'", payload);
});

// for debugging
channel.onMessage = (event, payload, _) => {
  // if (!event.startsWith("phx_") && !event.startsWith("chan_")) {
  console.debug(event, payload);
  // }
  return payload;
};

channel.on("user_joined", (payload) => {
  console.log("user_joined", payload);
});

channel.on("user_left", (payload) => {
  console.log("user_left", payload);
});

// channel.on("presence_state", (payload) => {
//   config.$presence_state.next(payload);
// });

// channel.on("presence_diff", (payload) => {
//   config.$presence_diff.next(payload);
// });

// // forward my camera movement to the room
// // not more frequently then every 200ms
// config.$camera_moved
//   .pipe(throttleTime(200))
//   .subscribe(([position, rotation]) => {
//     channel.push("i_moved", { position: position.asArray(), rotation: rotation.asArray() });
//   });

// // receive other users movements from the server
// channel.on("user_moved", (payload) => {
//   config.$user_moved.next(payload);
// });