import * as scripts from "./script.js";
import * as sender from "./sender.js";
import { Controller } from "./controller.js";

function start(mainContainer: HTMLElement) {
    let ctrl = new Controller();

    ctrl.ready().then(() => {
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
        //let targets = new target.Targets(ctrl);
        let senderElem = new sender.Sender(ctrl);
        //scriptsContainer.appendChild(targets);
        scriptsContainer.appendChild(senderElem);
        scriptsContainer.appendChild(scriptsElem);

        //mainContainer.appendChild(blocklyArea);
        //mainContainer.appendChild(blocklyDiv);
        mainContainer.appendChild(scriptsContainer);
    });
}

export { start };