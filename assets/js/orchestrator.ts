import * as Scene from "./systems/scene";
import * as Broker from "./systems/broker";
import * as State from "./systems/state";
import * as MeshBuilder from "./systems/mesh_builder";
import * as Position from "./systems/position";
import * as Color from "./systems/color";
import * as Material from "./systems/material";
import * as Avatar from "./systems/avatar";
import * as XRExperience from "./systems/xr-experience";
import * as Teleportable from "./systems/teleportable";
import * as XRHandController from "./systems/xr-hand-controller";
import * as Holdable from "./systems/holdable";
import * as Parent from "./systems/parent";

import { Components, Config, EntityId, StateMutation, StateOperation, XRButtonChange } from "./config";
import type { Socket } from "phoenix";
import { Subject } from "rxjs/internal/Subject";
import { take } from "rxjs/operators";
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience";


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
            $xr_helper_ready: new Subject<WebXRDefaultExperience>(),
            $xr_entered: new Subject<boolean>(),
            $xr_exited: new Subject<boolean>(),
            $xr_button_changes: new Subject<XRButtonChange & { handedness: "left" | "right"; }>(),
            $xr_axes: new Subject<{ x: number; y: number; } & { handedness: "left" | "right"; }>(),
            hand_controller: {}
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
        Material.init(config);
        XRExperience.init(config);
        Teleportable.init(config);
        XRHandController.init(config);
        Holdable.init(config);
        Parent.init(config);

        for (const [entity_id, components] of Object.entries(opts.entities)) {
            config.$state_mutations.next({ op: StateOperation.create, eid: entity_id, com: components, prev: {} });
        }

        config.$room_entered.pipe(take(1)).subscribe(() => {
            Object.keys(opts.entities).forEach((entity_id) => {
                config.scene.getMeshByName(entity_id)?.dispose(false, true);
            });
        });



    }
};

const socket = window["liveSocket"];
const { room_id, user_id, entities } = window["room_vars"];
orchestrator.init({ socket, room_id, user_id, entities });
