import { bus, enumName } from "/bus.js";
import * as buspb from "/pb/bus/bus_pb.js";
import * as roscopb from "/m/rosco/pb/rosco_pb.js";
import { ScriptEditor } from "./bscript.js";

const TOPIC_REQUEST = enumName(roscopb.BusTopic, roscopb.BusTopic.ROSCO_REQUEST);
const TOPIC_COMMAND = enumName(roscopb.BusTopic, roscopb.BusTopic.ROSCO_COMMAND);

type ValueSubscriber<T> = (value: T) => void;

interface ScriptWithID {
    id: number;
    v: roscopb.Script | undefined;
}

type ScriptsMap = { [key: number]: roscopb.Script };
type TargetsMap = { [key: number]: roscopb.Target };

class ValueUpdater<T> {
    private _subs: ValueSubscriber<T>[] = [];
    private _last: T;

    constructor(initial: T) {
        this._last = initial;
    }

    subscribe(vs: ValueSubscriber<T>): () => void {
        this._subs.push(vs);
        return () => {
            this._subs = this._subs.filter((v) => v !== vs);
        };
    }

    get last(): T {
        return this._last;
    }

    update(v: T) {
        this._last = v;
        this._subs.forEach((vs) => vs(v));
    }
}

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

    save(cfg: roscopb.Config): Promise<void> {
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

class Targets extends ValueUpdater<TargetsMap> {
    private _cfg: Cfg;

    constructor(cfg: Cfg) {
        super({});
        this._cfg = cfg;
        this._cfg.subscribe((cfg) => {
            this.update(cfg.targets)
        });
    }

    save(targets: TargetsMap): Promise<void> {
        let cfg = this._cfg.last.clone();
        cfg.targets = targets;
        return this._cfg.save(cfg);
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

    save(scripts: ScriptsMap): Promise<void> {
        let cfg = this._cfg.last.clone();
        cfg.scripts = scripts;
        return this._cfg.save(cfg);
    }
}

class Controller {
    private _cfg: Cfg;
    private _ready: Promise<void>;

    scriptEdit: ValueUpdater<ScriptWithID>;
    testTarget: ValueUpdater<number>;
    targets: Targets;
    scripts: Scripts;

    constructor() {
        this._cfg = new Cfg();

        this.scriptEdit = new ValueUpdater({ id: 0, v: undefined });
        this.testTarget = new ValueUpdater(0);

        this.targets = new Targets(this._cfg);
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

        this.targets.subscribe((targets) => {
            let selected = this.testTarget.last;
            if (targets[selected]) {
                return;
            }
            let keys = Object.keys(targets);
            if (!keys.length) {
                return;
            }
            this.testTarget.update(parseInt(keys[0]));
        })
    }

    ready(): Promise<void> {
        return this._ready;
    }

    sendOSC(address: string, osc: roscopb.OSCValue) {
        if (!this.testTarget.last) {
            return;
        }
        let smr = new roscopb.SendMessageRequest();
        smr.target = this.testTarget.last;
        smr.address = address;
        smr.values.push(osc);
        let msg = new buspb.BusMessage();
        msg.topic = TOPIC_REQUEST;
        bus.send(new buspb.BusMessage({
            topic: TOPIC_REQUEST,
            type:roscopb.MessageTypeRequest.MESSAGE_SEND_REQ,
            message: smr.toBinary(),
        }));
    }

    runScript(idOrScript: number | roscopb.Script) {
        if (!this.testTarget.last) {
            return;
        }
        let srr = new roscopb.ScriptRunRequest({
            target: this.testTarget.last,
        });
        if (typeof idOrScript === "number") {
            srr.scriptId = idOrScript;
        } else {
            srr.script = idOrScript;
        }
        bus.send(new buspb.BusMessage({
            topic: TOPIC_REQUEST,
            type: roscopb.MessageTypeRequest.SCRIPT_RUN_REQ,
            message: srr.toBinary(),
        }))
    }
}

export { Controller, ScriptsMap, TargetsMap };