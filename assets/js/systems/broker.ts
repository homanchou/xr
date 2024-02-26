import { Config, EntityPayload, StateOperation } from "../config";

export const init = (config: Config) => {

  // channel connection
  const { socket, $state_mutations, state } = config;
  socket.connect();
  let channel = socket.channel(`room:${config.room_id}`, {});
  config.channel = channel;

  // channel subscriptions
  channel.on("entities_state", (payload: EntityPayload) => {
    for (const [entity_id, components] of Object.entries(payload)) {
      $state_mutations.next({ op: StateOperation.create, eid: entity_id, com: components, prev: {} });
    }
  });


  channel.on("entities_diff", (payload: { creates: EntityPayload, updates: EntityPayload, deletes: EntityPayload; }) => {
    for (const [entity_id, components] of Object.entries(payload.creates)) {
      $state_mutations.next({ op: StateOperation.create, eid: entity_id, com: components, prev: {} });
    }
    for (const [entity_id, components] of Object.entries(payload.updates)) {
      const prev = state.get(entity_id) || {};
      $state_mutations.next({ op: StateOperation.update, eid: entity_id, com: components, prev });
    }
    for (const [entity_id, components] of Object.entries(payload.deletes)) {
      const prev = state.get(entity_id) || {};
      $state_mutations.next({ op: StateOperation.delete, eid: entity_id, com: components, prev });
    }
  });

  // for debugging
  channel.onMessage = (event, payload, _) => {
    if (!event.startsWith("phx_") && !event.startsWith("chan_")) {
      console.debug(event, payload);
    }
    return payload;
  };

  // when liveview emits enter_room
  window.addEventListener("live_to_xr", e => {
    config.$room_entered.next(true);

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
}

