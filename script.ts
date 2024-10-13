import * as roscopb from '/m/rosco/pb/rosco_pb.js';
import { Controller, ScriptsMap } from './controller.js';

class Scripts extends HTMLElement {
    private _button_new: HTMLButtonElement;
    private _div_scripts: HTMLDivElement;

    private _ctrl: Controller;

    constructor(ctrl: Controller) {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
<style>
#scripts {
    display: grid;
    grid-template-columns: max-content max-content max-content;
    column-gap: 0.75rem;
}
.column-header {
    font-weight: bolder;
}
</style>

<fieldset>
<legend>Scripts</legend>
<div id="scripts">
</div>
<button id="btn-new"> + </button>
</fieldset>
`;
        this._ctrl = ctrl;
        this._button_new = this.shadowRoot.querySelector('#btn-new');
        this._button_new.addEventListener('click', () => this._onNew());

        this._div_scripts = this.shadowRoot.querySelector('#scripts');

        this._ctrl.scripts.subscribe((scripts) => { this._updateScripts(scripts) });
    }

    private _updateScripts(scripts: ScriptsMap) {
        this._div_scripts.innerHTML = `
<div class="column-header">Name</div>
<div class="column-header">Actions</div>
<div class="column-header"></div>
`;
        for (let idStr of Object.keys(scripts)) {
            let id = parseInt(idStr);
            this._addScriptToTable(id, scripts[id]);
        }
    }

    private _addScriptToTable(id: number, script: roscopb.Script) {
        let nameDiv = document.createElement('div');
        nameDiv.innerText = script.name;
        this._div_scripts.appendChild(nameDiv);
        let actionsDiv = document.createElement('div');
        actionsDiv.innerText = script.actions.length.toString();
        this._div_scripts.appendChild(actionsDiv);

        let buttonsDiv = document.createElement('div');
        let editButton = document.createElement('button') as HTMLButtonElement;
        editButton.innerText = 'Edit';
        editButton.addEventListener('click', () => {
            this._ctrl.scriptEdit.update({ id, v: script });
        });
        buttonsDiv.appendChild(editButton);
        let deleteButton = document.createElement('button') as HTMLButtonElement;
        deleteButton.innerText = 'Delete';
        deleteButton.addEventListener('click', () => {
            if (confirm(`Really delete ${script.name}?`)) {
                let scripts = this._ctrl.scripts.last;
                delete(scripts[id]);
                this._ctrl.scripts.save(scripts);
            }
        });
        let runButton = document.createElement('button') as HTMLButtonElement;
        runButton.innerText = 'Run';
        runButton.addEventListener('click', () => {
            this._ctrl.runScript(id);
        });
        buttonsDiv.appendChild(deleteButton);
        this._div_scripts.appendChild(buttonsDiv);
    }

    private _onNew() {
        let script = new roscopb.Script();
        script.name = 'New Script';
        this._ctrl.scriptEdit.update({
            id: 0,
            v: script,
        });
    }
}
customElements.define('rosco-scripts-unused', Scripts);

export { Scripts };