import { config } from "../config";


// channel connection
const socket = config.socket;
socket.connect();
let channel = socket.channel(`room:${config.room_id}`, {});
channel.join()
  .receive("ok", resp => { console.log("Joined successfully", resp); })
  .receive("error", resp => { console.log("Unable to join", resp); });

channel.on("shout", payload => {
  console.log("I received a 'shout'", payload);
});

