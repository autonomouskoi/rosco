import { bus, enumName } from "/bus.js";
import * as scripts from "./script.js";
import * as sender from "./sender.js";
import * as target from "./target.js";
import { ScriptEditor } from "./bscript.js";
import { Controller } from "./controller.js";

function start(mainContainer: HTMLElement) {
    document.querySelector("title").innerText = 'Rosco';
    let ctrl = new Controller();

    let blocklyDiv = document.createElement('div') as HTMLDivElement;
    blocklyDiv.id = 'blocklyDiv';
    blocklyDiv.style.setProperty('position', 'absolute');
    let blocklyArea = document.createElement('div') as HTMLDivElement;
    blocklyArea.id = 'blocklyArea';
    blocklyArea.style.setProperty('height', '100vh');
    new ScriptEditor(blocklyDiv, ctrl);

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
        mainContainer.appendChild(blocklyArea);
        mainContainer.appendChild(blocklyDiv);
        mainContainer.appendChild(scriptsContainer);
    });
}

export { start };