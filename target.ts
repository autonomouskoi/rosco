import * as roscopb from '/m/rosco/pb/rosco_pb.js';
import { GloballyStyledHTMLElement } from '/global-styles.js';
import { Controller } from './controller.js';

class Targets extends GloballyStyledHTMLElement {
    private _button_cancel: HTMLButtonElement;
    private _button_new: HTMLButtonElement;
    private _button_save: HTMLButtonElement;
    private _dialog_edit: HTMLDialogElement;
    private _input_edit_name: HTMLInputElement;
    private _input_edit_host: HTMLInputElement;
    private _input_edit_port: HTMLInputElement;
    private _div_targets: HTMLDivElement;

    private _ctrl: Controller;
    private _editing_id = 0;

    constructor(ctrl: Controller) {
        super();
        this.shadowRoot.innerHTML = `
<style>
::backdrop {
    background-color: #bbb;
    opacity: 0.75;
}
</style>

<dialog id="dialog-edit">
    <div class="grid grid-2-col">
        <label for="input-edit-name">Name</label>
        <input type="text" id="input-edit-name"
            required
            minlength="1"
        />

        <label for="input-edit-host">Hostname</label>
        <input type="text" id="input-edit-host"
            required
            minlength="1"
        />

        <label for="input-edit-port">Port</label>
        <input type="text" id="input-edit-port"
            required
            size="5"
            minlength="1"
            maxlength="5"
            pattern="[1-9][0-9]{0,4}"
        />
    </div>

    <button id="btn-save">Save</button>
    <button id="btn-cancel">Cancel</button>
</dialog>
<fieldset>
    <legend>Targets</legend>
    <div id="targets" class="grid grid-4-col">
    </div>
    <button id="btn-new"> + </button>
</fieldset>
`;
        this._dialog_edit = this.shadowRoot.querySelector('#dialog-edit');
        this._button_cancel = this._dialog_edit.querySelector('#btn-cancel');
        this._button_cancel.addEventListener('click', () => this._handleEditCancel());
        this._button_save = this._dialog_edit.querySelector('#btn-save');
        this._button_save.addEventListener('click', () => this._handleEditSave());

        this._button_new = this.shadowRoot.querySelector('#btn-new');
        this._button_new.addEventListener('click', () => this._showEdit());

        this._input_edit_name = this.shadowRoot.querySelector('#input-edit-name');
        this._input_edit_name.addEventListener('input', () => this._editValidate());
        this._input_edit_host = this.shadowRoot.querySelector('#input-edit-host');
        this._input_edit_host.addEventListener('input', () => this._editValidate());
        this._input_edit_port = this.shadowRoot.querySelector('#input-edit-port');
        this._input_edit_port.addEventListener('input', () => this._editValidate());

        this._div_targets = this.shadowRoot.querySelector('#targets');

        this._ctrl = ctrl;
        this._ctrl.targets.subscribe((targets) => this._updateTargets(targets));
    }

    private _updateTargets(targets: { [key: number]: roscopb.Target }) {
        this._div_targets.innerHTML = `
<div class="column-header">Name</div>
<div class="column-header">Hostname</div>
<div class="column-header">Port</div>
<div class="column-header"></div>
`;
        for (let idStr of Object.keys(targets)) {
            let id = parseInt(idStr);
            this._addTargetToTable(id, targets[id]);
        }
        this._handleEditCancel();
    }

    private _addTargetToTable(id: number, target: roscopb.Target) {
        for (let value of [target.name, target.address, target.port]) {
            let div = document.createElement('div') as HTMLDivElement;
            div.innerText = `${value}`;
            this._div_targets.appendChild(div);
        }
        let buttonsDiv = document.createElement('div') as HTMLDivElement;
        let editButton = document.createElement('button') as HTMLButtonElement;
        editButton.innerText = 'Edit';
        editButton.addEventListener('click', () => this._handleEdit(id, target) );
        buttonsDiv.appendChild(editButton);

        let delButton = document.createElement('button') as HTMLButtonElement;
        delButton.innerText = 'Delete';
        delButton.addEventListener('click', () => {
            if (confirm(`Delete ${target.name}?`)) {
                this._handleDelete(id);
            }
        });
        buttonsDiv.appendChild(delButton);

        this._div_targets.appendChild(buttonsDiv);
    }

    private _handleEdit(id: number, target: roscopb.Target) {
        this._editing_id = id;
        this._input_edit_name.value = target.name;
        this._input_edit_host.value = target.address;
        this._input_edit_port.value = target.port.toString();
        this._showEdit();
    }

    private _handleEditSave() {
        let target = new roscopb.Target();
        target.name = this._input_edit_name.value;
        target.address = this._input_edit_host.value;
        target.port = parseInt(this._input_edit_port.value);
        let targets = { ...this._ctrl.targets.last};
        targets[this._editing_id] = target;
        this._ctrl.targets.save(targets);
        this._hideEdit();
    }

    private _handleEditCancel() {
        this._editing_id = 0;
        this._input_edit_name.value = '';
        this._input_edit_host.value = '';
        this._input_edit_port.value = '';
        this._hideEdit();
    }

    private _hideEdit() {
        this._dialog_edit.close();
        this._button_new.disabled = false;
    }

    private _showEdit() {
        this._dialog_edit.showModal();
        this._button_new.disabled = true;
        this._editValidate();
    }

    private _editValidate() {
        this._button_save.disabled = [
            this._input_edit_name,
            this._input_edit_host,
            this._input_edit_port,
        ].some((elem) => !elem.validity.valid)
    }

    private _handleDelete(id: number) {
        let targets = { ...this._ctrl.targets.last};
        delete targets[id];
        this._ctrl.targets.save(targets);
    }
}
customElements.define('rosco-targets-unused', Targets);

export { Targets };