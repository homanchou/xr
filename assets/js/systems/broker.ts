
import { config } from "../config";

// channel connection
const socket = config.socket;
socket.connect();
let channel = socket.channel(`room:${config.room_id}`, {});
config.channel = channel;

channel.on("stoc", (event) => {
  config.$room_stream.next(event);
});

// for debugging
channel.onMessage = (event, payload, _) => {
  // if (!event.startsWith("phx_") && !event.startsWith("chan_")) {
  console.debug(event, payload);
  // }
  return payload;
};


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
      });

  }

});