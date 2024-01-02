import { config } from "../config";

// channel connection
const socket = config.socket;
socket.connect();
let channel = socket.channel(`room:${config.room_id}`, {});
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
  if (!event.startsWith("phx_") && !event.startsWith("chan_")) {
    console.debug(event, payload);
  }
  return payload;
};

channel.on("presence_state", (payload) => {
  config.$presence_state.next(payload);
});

channel.on("presence_diff", (payload) => {
  config.$presence_diff.next(payload);
});
