import { Config, StateOperation } from "../config";

export const init = (config: Config) => {
  
  // channel connection
  const {socket, $state_mutations} = config;
  socket.connect();
  let channel = socket.channel(`room:${config.room_id}`, {});
  config.channel = channel;

  // channel subscriptions
  channel.on("entities_state", (payload: { [entity_id: string]: {[component_name: string]: any} }) => {
    for (const [entity_id, components] of Object.entries(payload)) {
      $state_mutations.next({op: StateOperation.create, eid: entity_id, com: components});
    }
  });


  // channel.on("state_mutations", (event) => {
  //   config.$state_mutations.next(event);
  // });

  // for debugging
  channel.onMessage = (event, payload, _) => {
    if (!event.startsWith("phx_") && !event.startsWith("chan_")) {
      console.debug(event, payload);
    }
    return payload;
  };

  // when liveview emits enter_room
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
}

