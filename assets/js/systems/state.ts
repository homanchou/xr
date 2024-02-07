import { StateOperation, Config } from "../config";

export const init = (config: Config) => {

  const { $state_mutations, state } = config;

  // keep state updated

  $state_mutations.subscribe((evt) => {
    console.log('state mutation', JSON.stringify(evt));
    if (evt.op === StateOperation.create) {
      state.set(evt.eid, evt.com);

    } else if (evt.op === StateOperation.update) {
      const prev = state.get(evt.eid) || {};
      state.set(evt.eid, { ...prev, ...evt.com });

    } else if (evt.op === StateOperation.delete) {
      state.delete(evt.eid);
    }
  });

};
