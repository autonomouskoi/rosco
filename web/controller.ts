import { bus, enumName } from "/bus.js";
import * as buspb from "/pb/bus/bus_pb.js";
import * as roscopb from "/m/rosco/pb/rosco_pb.js";
import { ValueUpdater } from "/vu.js";

const TOPIC_REQUEST = enumName(roscopb.BusTopic, roscopb.BusTopic.ROSCO_REQUEST);
const TOPIC_COMMAND = enumName(roscopb.BusTopic, roscopb.BusTopic.ROSCO_COMMAND);

interface ScriptWithID {
    id: number;
    v: roscopb.Script | undefined;
}

type ScriptsMap = { [key: number]: roscopb.Script };

class Cfg extends ValueUpdater<roscopb.Config> {
    constructor() {
        super(new roscopb.Config());
    }

    refresh() {
        bus.sendAnd(new buspb.BusMessage({
            topic: TOPIC_REQUEST,
            type: roscopb.MessageTypeRequest.CONFIG_GET_REQ,
            message: new roscopb.ConfigGetRequest().toBinary(),
        })).then((reply) => {
            if (reply.error) {
                throw reply.error;
            }
            let cgResp = roscopb.ConfigGetResponse.fromBinary(reply.message);
            this.update(cgResp.config);
        });
    }

    async save(cfg: roscopb.Config) {
        let csr = new roscopb.ConfigSetRequest();
        csr.config = cfg;
        let msg = new buspb.BusMessage();
        msg.topic = TOPIC_COMMAND;
        msg.type = roscopb.MessageTypeCommand.CONFIG_SET_REQ;
        msg.message = csr.toBinary();
        return bus.sendAnd(msg)
            .then((reply) => {
                let csResp = roscopb.ConfigSetResponse.fromBinary(reply.message);
                this.update(csResp.config);
            });
    }
}

class Scripts extends ValueUpdater<ScriptsMap> {
    private _cfg: Cfg;

    constructor(cfg: Cfg) {
        super({});
        this._cfg = cfg;
        this._cfg.subscribe((cfg) => {
            this.update(cfg.scripts);
        });
    }

    async save(scripts: ScriptsMap) {
        let cfg = this._cfg.last.clone();
        cfg.scripts = scripts;
        return this._cfg.save(cfg);
    }
}

class Controller {
    private _cfg: Cfg;
    private _ready: Promise<void>;

    scriptEdit: ValueUpdater<ScriptWithID>;
    testTarget = '';
    scripts: Scripts;

    constructor() {
        this._cfg = new Cfg();

        this.scriptEdit = new ValueUpdater({ id: 0, v: undefined });

        this.scripts = new Scripts(this._cfg);
        this._ready = new Promise<void>((resolve) => {
            bus.waitForTopic(TOPIC_REQUEST, 5000)
                .then(() => {
                    this._cfg.refresh();
                    let unsub = this._cfg.subscribe(() => {
                        resolve();
                        unsub();
                    });
                });
        })

    }

    get cfg(): Cfg {
        return this._cfg;
    }

    ready(): Promise<void> {
        return this._ready;
    }

    sendOSC(address: string, osc: roscopb.OSCValue) {
        let script = new roscopb.Script({
            name: 'one-shot',
            actions: [new roscopb.ScriptAction({
                address: address,
                type: roscopb.ScriptActionType.ActionTypeSet,
                values: [osc],
            })],
        });
        this.runScript(script);
    }

    runScript(idOrScript: number | roscopb.Script, target = '') {
        if (!(target || this.testTarget)) {
            return;
        }
        let srr = new roscopb.ScriptRunRequest({
            target: target ? target : this.testTarget,
        });
        if (typeof idOrScript === "number") {
            srr.scriptId = idOrScript;
        } else {
            srr.script = idOrScript;
        }
        bus.sendAnd(new buspb.BusMessage({
            topic: TOPIC_REQUEST,
            type: roscopb.MessageTypeRequest.SCRIPT_RUN_REQ,
            message: srr.toBinary(),
        })).catch((e) => console.log(`ERROR requesting script run: ${e}`));
    }
}

export { Cfg, Controller, ScriptsMap };