import { Scripts } from "./script.js";
import { Sender } from "./sender.js";
import { Controller } from "./controller.js";
import { Triggers } from "./trigger.js";

function start(mainContainer: HTMLElement) {
    let ctrl = new Controller();

    ctrl.ready().then(() => {
        mainContainer.appendChild(new Sender(ctrl));
        mainContainer.appendChild(new Scripts(ctrl));
        mainContainer.appendChild(new Triggers(ctrl));
    });
}

export { start };