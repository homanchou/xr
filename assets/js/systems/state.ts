import { StateOperation, config } from "../config";
import type { RoomEvent } from "../config";

export type EntityComponentValue = Map<string, any>;
export type ComponentName = string;
export type State = Map<ComponentName, EntityComponentValue>;

export const state = new Map<ComponentName, EntityComponentValue>();

const { channel, $room_stream } = config;
config.state = state;

// modify state only through these functions
// and send messages to the server
export const create_entity = (opts: {
  entity_id?: string;
  components: object;
  note?: string;
  local?: boolean;
}) => {
  const { components, note, local } = opts;
  let entity_id = opts.entity_id || crypto.randomUUID();

  const payload: RoomEvent = { op: StateOperation.create, eid: entity_id, com: components, note };
  if (!local) {
    channel.push("ctos", payload);
  }
  $room_stream.next(payload);
};

export const update_entity = (opts: {
  entity_id: string;
  components: object;
  note?: string;
  local?: boolean;
}) => {
  const { entity_id, components, note, local } = opts;
  const payload: RoomEvent = { op: StateOperation.update, eid: entity_id, com: components, note };
  if (!local) {
    channel.push("ctos", payload);
  }
  $room_stream.next(payload);
};

export const delete_entity = (opts: {
  entity_id: string;
  note?: string;
  local?: boolean;
}) => {
  const { entity_id, note, local } = opts;
  const payload: RoomEvent = { op: StateOperation.delete, eid: entity_id, note };
  if (!local) {
    channel.push("ctos", payload);
  }
  $room_stream.next(payload);
};

// keep state updated

$room_stream.subscribe((evt) => {
  if (evt.op === StateOperation.create) {
      for (const [component_name, component_value] of Object.entries(
       evt.com 
      )) {
        state.set(component_name, state.get(component_name) || new Map());
        state.get(component_name)!.set(evt.eid, component_value);
      }
    
  } else if (evt.op === StateOperation.update) {
      for (const [component_name, component_value] of Object.entries(
        evt.com
      )) {
        state.set(component_name, state.get(component_name) || new Map());
        state.get(component_name)!.set(evt.eid, component_value);
      }
    
  } else if (evt.op === StateOperation.delete) {
      for (const component_name of Object.keys(state)) {
        state.get(component_name)!.delete(evt.eid);
      }
  }
});
