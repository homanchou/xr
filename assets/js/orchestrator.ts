

import * as Scene from "./systems/scene";
import * as Broker from "./systems/broker";
import * as State from "./systems/state";
import * as MeshBuilder from "./systems/mesh_builder";
import * as Position from "./systems/position";
import * as Color from "./systems/color";
import * as Avatar from "./systems/avatar";
import { Components, Config, EntityId, StateMutation, StateOperation } from "./config";
import type { Socket } from "phoenix";
import { Subject } from "rxjs/internal/Subject";


export const orchestrator = {
    init: (opts: { socket: Socket, room_id: string, user_id: string, entities: { [entity_id: string]: any; }; }) => {
        const config: Config = {
            room_id: opts.room_id,
            user_id: opts.user_id,
            scene: null,
            socket: opts.socket,
            channel: null,
            state: new Map<EntityId, Components>(),
            $channel_joined: new Subject<boolean>(),
            $room_entered: new Subject<boolean>(),
            $camera_moved: new Subject<any>(),
            $state_mutations: new Subject<StateMutation>(),
        };

        // debug
        window["config"] = config;

        // initialize systems, order matters
        Scene.init(config);
        Broker.init(config);
        State.init(config);
        MeshBuilder.init(config);
        Position.init(config);
        Avatar.init(config);
        Color.init(config);

        for (const [entity_id, components] of Object.entries(opts.entities)) {
            config.$state_mutations.next({ op: StateOperation.create, eid: entity_id, com: components });
        }

    }
};

const socket = window["liveSocket"];
const { room_id, user_id, entities } = window["room_vars"];
orchestrator.init({ socket, room_id, user_id, entities });
