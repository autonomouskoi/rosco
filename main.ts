import { bus, enumName } from "/bus.js";
import * as buspb from "/pb/bus/bus_pb.js";
import * as roscopb from "/m/rosco/pb/rosco_pb.js";
import * as scripts from "./script.js";
import * as sender from "./sender.js";
import * as target from "./target.js";
import { ScriptEditor } from "./bscript.js";
import { Controller } from "./controller.js";

const TOPIC_REQUEST = enumName(roscopb.BusTopic, roscopb.BusTopic.ROSCO_REQUEST);

function start(mainContainer: HTMLElement) {
    document.querySelector("title").innerText = 'Rosco';
    let ctrl = new Controller();

    let blockly = document.createElement('div') as HTMLDivElement;
    blockly.style.setProperty('width', '800px');
    blockly.style.setProperty('height', '460px');
    new ScriptEditor(blockly, ctrl);

    let scriptsContainer = document.createElement('div') as HTMLDivElement;
    scriptsContainer.style.setProperty('z-index', '1000');
    scriptsContainer.style.setProperty('position', 'absolute');
    scriptsContainer.style.setProperty('top', '0px');
    scriptsContainer.style.setProperty('left', '0px');
    scriptsContainer.style.setProperty('width', '100%');
    scriptsContainer.style.setProperty('height', '100%');
    scriptsContainer.style.setProperty('background', 'white');
    ctrl.scriptEdit.subscribe((script) => {
        scriptsContainer.style.setProperty('display', script.v == undefined ? 'block' : 'none');
    });
    let scriptsElem = new scripts.Scripts(ctrl);
    let targets = new target.Targets(ctrl);
    let senderElem = new sender.Sender(ctrl);
    scriptsContainer.appendChild(targets);
    scriptsContainer.appendChild(senderElem);
    scriptsContainer.appendChild(scriptsElem);

    ctrl.ready().then(() => {
        mainContainer.appendChild(blockly);
        mainContainer.appendChild(scriptsContainer);
    });
}

export { start };