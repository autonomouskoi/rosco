import * as roscopb from '/m/rosco/pb/rosco_pb.js';
import { Controller } from './controller.js';
import { OSCTargetSelect, UpdatingControlPanel } from '/tk.js';

let help = document.createElement('div');
help.innerHTML = `HALP`;

class Triggers extends UpdatingControlPanel<roscopb.Config> {
    private _table: HTMLDivElement;

    private _ctrl: Controller;

    constructor(ctrl: Controller) {
        super({ title: 'Triggers', help, data: ctrl.cfg });

        this._ctrl = ctrl;

        this.innerHTML = `
<div id="table" class="grid-4-col">
    <div class="column-header">Name</div>
    <div class="column-header">Target</div>
    <div class="column-header">Script</div>
    <div class="column-header">
        <button id="new" type="button">+</button>
    </div>
</div>
`;
        let newDialog = new NewDialog();
        newDialog.save = (id: string, target: string, scriptID: number) =>
            this._saveNew(id, target, scriptID);
        this.appendChild(newDialog);

        this._table = this.querySelector('div#table');

        this.querySelector('button#new').addEventListener('click', () => newDialog.display(this.last.scripts));

        this.update(ctrl.cfg.last);
    }

    update(cfg: roscopb.Config) {
        this._table.querySelectorAll('div:not(.column-header)').forEach((elem) => {
            this._table.removeChild(elem);
        });
        for (let id of Object.keys(cfg.triggers)) {
            this._addToTable(id, cfg.triggers[id]);
        }
    }

    private _addTableDiv(text: string): HTMLDivElement {
        let d = document.createElement('div');
        if (text) {
            d.innerText = text;
        }
        this._table.appendChild(d);
        return d;
    }

    private _addToTable(id: string, trigger: roscopb.Trigger) {
        this._addTableDiv(id);
        this._addTableDiv(trigger.target);
        let script = this.last.scripts[trigger.scriptId];
        this._addTableDiv(script ? script.name : 'deleted!');

        let buttonsDiv = this._addTableDiv('');
        let run = addAButton('Run', 'Activate this trigger', buttonsDiv);
        run.disabled = !script;
        run.addEventListener('click', () => this._ctrl.runScript(script, trigger.target));

        addAButton('Delete', 'Delete this trigger', buttonsDiv)
            .addEventListener('click', () => this._delete(id));

        let link = document.createElement('a');
        link.innerHTML = '&#x1F517;';
        link.href = `/m/26f36f67f6931ed9/_webhook?trigger=${id}`;
        buttonsDiv.appendChild(link);
    }

    private _saveNew(id: string, target: string, scriptId: number) {
        let cfg = this.last.clone();
        cfg.triggers[id] = new roscopb.Trigger({
            target,
            scriptId
        });
        this.save(cfg);
    }

    private _delete(id: string) {
        if (!confirm(`Really delete ${id}?`)) {
            return;
        }
        let cfg = this.last.clone();
        delete (cfg.triggers[id]);
        this.save(cfg);
    }
}
customElements.define('rosco-triggers', Triggers, { extends: 'fieldset' });

class NewDialog extends HTMLDialogElement {
    private _name: HTMLInputElement;
    private _target: OSCTargetSelect;
    private _script: HTMLSelectElement;

    save = (id: string, target: string, scriptID: number) => { };

    constructor() {
        super();

        this.innerHTML = `
<h1>New Trigger</h1>
<div class="grid-2-col">
    <label for="name">Name</label>
    <input type="text" id="name" />

    <label for="target">Target</label>

    <label for="script">Script</label>
    <select id="script"></select>

    <button type="button" id="save">Save</button>
    <button type="button" id="cancel">Cancel</button>
</div>
`;

        this._name = this.querySelector('input#name');

        this._target = new OSCTargetSelect();
        this._target.id = 'target';
        this.querySelector('label[for=target]').after(this._target);

        this._script = this.querySelector('select#script');

        this.querySelector('button#save').addEventListener('click', () => this._save());
        this.querySelector('button#cancel').addEventListener('click', () => this._cancel());
    }

    display(scripts: { [key: number]: roscopb.Script }) {
        this._script.textContent = '';
        Object.keys(scripts).map((idStr) => {
            let option = document.createElement('option');
            option.value = idStr;
            let id = parseInt(idStr);
            option.innerText = scripts[id].name;
            return option;
        }).sort((a, b) => a.innerText.localeCompare(b.innerText))
            .forEach((option) => this._script.appendChild(option));
        this.showModal();
    }

    private _save() {
        this.save(this._name.value, this._target.value, parseInt(this._script.value));
        this._cancel();
    }

    private _cancel() {
        this._name.value = '';
        this.close();
    }
}
customElements.define('rosco-triggers-new', NewDialog, { extends: 'dialog' });

function addAButton(text: string, title: string, parent: HTMLElement): HTMLButtonElement {
    let button = document.createElement('button');
    button.type = 'button';
    button.innerText = text;
    button.title = title;
    parent.appendChild(button);
    return button;
}

export { Triggers };