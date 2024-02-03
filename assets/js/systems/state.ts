import { StateOperation, config } from "../config";

export type EntityComponentValue = Map<symbol, any>;
export type ComponentName = string;
export type State = Map<ComponentName, EntityComponentValue>;

export const state = new Map<ComponentName, EntityComponentValue>();

const { channel, $state_mutations } = config;
config.state = state;

// keep state updated

$state_mutations.subscribe((evt) => {
  if (evt.op === StateOperation.create) {
      for (const [component_name, component_value] of Object.entries(
       evt.com 
      )) {
        state.set(component_name, state.get(component_name) || new Map());
        state.get(component_name)!.set(Symbol.for(evt.eid), component_value);
      }
    
  } else if (evt.op === StateOperation.update) {
      for (const [component_name, component_value] of Object.entries(
        evt.com
      )) {
        state.set(component_name, state.get(component_name) || new Map());
        state.get(component_name)!.set(Symbol.for(evt.eid), component_value);
      }
    
  } else if (evt.op === StateOperation.delete) {
      for (const component_name of Object.keys(state)) {
        state.get(component_name)!.delete(Symbol.for(evt.eid));
      }
  }
});
