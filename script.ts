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
<div id="scripts"></div>
<button id="btn-new">New</button>
<button id="btn-import">Import</button>
</fieldset>
`;
        this._ctrl = ctrl;
        this._button_new = this.shadowRoot.querySelector('#btn-new');
        this._button_new.addEventListener('click', () => this._onNew());

        this._div_scripts = this.shadowRoot.querySelector('#scripts');

        let dialogImport = new ImportDialog(ctrl);
        this.shadowRoot.appendChild(dialogImport);

        let buttonImport = this.shadowRoot.querySelector('#btn-import');
        buttonImport.addEventListener('click', () => dialogImport.showModal());

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
        buttonsDiv.appendChild(deleteButton);

        let runButton = document.createElement('button') as HTMLButtonElement;
        runButton.innerText = 'Run';
        runButton.addEventListener('click', () => {
            this._ctrl.runScript(id);
        });
        buttonsDiv.appendChild(runButton);

        let exportButton = document.createElement('button') as HTMLButtonElement;
        exportButton.innerText = 'Export';
        exportButton.addEventListener('click', () => {
            if (!navigator.clipboard) {
                return;
            }
            navigator.clipboard.writeText(script.toJsonString()).then(() => {
                exportButton.innerText = 'Copied to Clipboard!';
                setTimeout(() => {exportButton.innerText = 'Export'}, 5000);
            });
        });
        buttonsDiv.appendChild(exportButton);

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

class ImportDialog extends HTMLElement {
    private _dialog: HTMLDialogElement;
    private _textarea: HTMLTextAreaElement;
    private _btn_cancel: HTMLButtonElement;
    private _btn_import: HTMLButtonElement;

    private _ctrl: Controller;

    constructor(ctrl: Controller) {
        super();

        this.innerHTML = `
<dialog>
<h1>Import Script</h1>
    <textarea
        rows="10"
        cols="60"
    ></textarea>
    <div>
    <button id="import">Import</button>
    <button id="cancel">Cancel</button>
    </div>
<dialog>
`;

        this._dialog = this.querySelector('dialog');
        this._textarea = this.querySelector('textarea');
        this._btn_cancel = this.querySelector('#cancel');
        this._btn_cancel.addEventListener('click', () => this._cancel());
        this._btn_import = this.querySelector('#import');
        this._btn_import.addEventListener('click', () => this._import());
        this._ctrl = ctrl;
    }

    private _cancel() {
        this._textarea.value = '';
        this._dialog.close();
    }
    
    private _import() {
        let script: roscopb.Script
        try {
            script = roscopb.Script.fromJsonString(this._textarea.value);
        } catch (e) {
            alert('invalid script');
            return;
        }
        this._cancel();
        this._ctrl.scriptEdit.update({ id: 0, v: script });
    }

    showModal() {
        this._dialog.showModal();
    }
}
customElements.define('rosco-import-dialog-unused', ImportDialog);

export { Scripts };