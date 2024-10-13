import { enumName } from '/bus.js';
import * as roscopb from '/m/rosco/pb/rosco_pb.js';
import * as input from './input.js';
import { GloballyStyledHTMLElement } from '/global-styles.js';

interface scriptActionEdit {
    elements(): HTMLElement[];
    getAction(): roscopb.ScriptAction;
    valid(): boolean;
}

class ScriptActionEditSleep {
    private _duration: input.Duration;

    constructor(action: roscopb.ScriptAction) {
        this._duration = new input.Duration();
        this._duration.value = action.durationMs;
    }

    elements(): HTMLElement[] {
        return this._duration.elements();
    }

    getAction(): roscopb.ScriptAction {
        let sa = new roscopb.ScriptAction();
        sa.type = roscopb.ScriptActionType.ActionTypeSleep;
        sa.durationMs = this._duration.value;
        return sa;
    }
    
    valid(): boolean {
        return this._duration.valid(); 
    }
}

class ScriptActionEditSet {
    private _address: input.OSCAddress;
    private _value: input.OSCValue;

    constructor(action: roscopb.ScriptAction) {
        if (action.values.length == 0) {
            action.values.push(new roscopb.OSCValue());
        }
        this._address = new input.OSCAddress();
        this._address.value = action.address;
        this._value = new input.OSCValue();
        this._value.value = action.values[0];
    }

    elements(): HTMLElement[] {
        return [...this._address.elements(), ...this._value.elements()];
    }

    getAction(): roscopb.ScriptAction {
        let sa = new roscopb.ScriptAction();
        sa.type = roscopb.ScriptActionType.ActionTypeSet;
        sa.address = this._address.value;
        sa.values.push(this._value.value);
        return sa;
    }

    valid(): boolean {
        return this._address.valid()
            && this._value.valid();
    }
}

class ScriptActionEditFade {
    private _address: input.OSCAddress;
    private _from: input.FloatField;
    private _to: input.FloatField;
    private _duration: input.Duration;

    constructor(action: roscopb.ScriptAction) {
        while (action.values.length < 2) {
            action.values.push(new roscopb.OSCValue());
        }

        this._address = new input.OSCAddress();
        this._address.value = action.address;
        this._from = new input.FloatField('From');
        this._from.value = action.values[0];
        this._to = new input.FloatField('To');
        this._to.value = action.values[1];
        this._duration = new input.Duration();
        this._duration.value = action.durationMs;
    }

    elements(): HTMLElement[] {
        return [
            ...this._address.elements(),
            ...this._from.elements(),
            ...this._to.elements(),
            ...this._duration.elements(),
        ];
    }

    getAction(): roscopb.ScriptAction {
        let sa = new roscopb.ScriptAction();
        sa.type = roscopb.ScriptActionType.ActionTypeFade;
        sa.address = this._address.value;
        sa.values.push(this._from.value) 
        sa.values.push(this._to.value);
        sa.durationMs = this._duration.value;
        return sa;
    }

    valid(): boolean {
        return this._address.valid()
            && this._from.valid()
            && this._to.valid()
            && this._duration.valid();
    }
}

class ScriptActionEdit extends GloballyStyledHTMLElement {
    private _dialog: HTMLDialogElement;

    private _button_cancel: HTMLButtonElement;
    private _button_ok: HTMLButtonElement;
    private _div_fields: HTMLDivElement;
    private _select_action_type: HTMLSelectElement;

    private _scriptAction: scriptActionEdit;
    private _action = new roscopb.ScriptAction();

    onSave = (action: roscopb.ScriptAction) => {};

    constructor() {
        super();
        this.shadowRoot.innerHTML = `
<dialog>
    <h2>Script Action</h2>

<div id="fields" class="grid grid-2-col">
    <label for="select-action-type" class="keep">Action Type</label>
    <select id="select-action-type" class="keep">
        <option value="0">Set</option>
        <option value="1">Fade</option>
        <option value="2">Sleep</option>
    </select>
</div>

    <button id="btn-ok">OK</button>
    <button id="btn-cancel">Cancel</button>
</dialog>
`;
        this._dialog = this.shadowRoot.querySelector('dialog');
        this._button_cancel = this.shadowRoot.querySelector('#btn-cancel');
        this._button_cancel.addEventListener('click', () => this._onCancel());
        this._button_ok = this.shadowRoot.querySelector('#btn-ok');
        this._button_ok.addEventListener('click', () => this._onOK());
        this._select_action_type = this.shadowRoot.querySelector('#select-action-type');
        this._select_action_type.addEventListener('change', () => this._onSelectActionTypeChange());
        this._div_fields = this.shadowRoot.querySelector('#fields');
    }

    private _onCancel() {
        this._dialog.close();
        this._action = new roscopb.ScriptAction();
    }

    showModal() {
        this._dialog.showModal();
        this._onSelectActionTypeChange();
    }

    private _onSelectActionTypeChange() {
        switch (this._select_action_type.value) {
            case '0':
                this._scriptAction = new ScriptActionEditSet(this._action);
                break;
            case '1':
                this._scriptAction = new ScriptActionEditFade(this._action);
                break;
            case '2':
                this._scriptAction = new ScriptActionEditSleep(this._action);
                break;
        }
        Array.from(this._div_fields.children)
            .filter((e) => !e.classList.contains('keep'))
            .forEach((e) => this._div_fields.removeChild(e));
        this._scriptAction.elements().forEach((e) => this._div_fields.appendChild(e))
    }

    set action(action: roscopb.ScriptAction) {
        this._action = action;
        this._select_action_type.value = action.type.toString();
        this._onSelectActionTypeChange();
    }

    private _onOK() {
        if (!this._scriptAction.valid()) {
            return;
        }
        let action = this._scriptAction.getAction();
        this.onSave(action);
        this._dialog.close();
    }
}
customElements.define('rosco-script-action-edit', ScriptActionEdit);

class ScriptActionTable extends GloballyStyledHTMLElement {
    constructor() {
        super();

        this.shadowRoot.innerHTML = `
<style>
table {
    border-collapse: separate;
    border-spacing: 1em;
}
</style>
<table></table>
`;
    }

    set actions(actions: roscopb.ScriptAction[]) {
        let table = this.shadowRoot.querySelector('table');
        table.innerHTML = `
<tr>
    <th>Type</th>
    <th>Address</th>
    <th>Value</th>
    <th>Duration (ms)</th>
    <th></th>
</tr>
`;
        actions.map((action) => this._createRow(action)) 
            .forEach((row) => table.appendChild(row));
    }

    private _createRow(action: roscopb.ScriptAction): HTMLTableRowElement {
        let tr = document.createElement('tr');

        let type = document.createElement('td');
        type.innerText = enumName(roscopb.ScriptActionType, action.type).replace('ActionType', '');
        tr.appendChild(type);

        let address = document.createElement('td');
        address.innerText = action.address ? action.address : '';
        tr.appendChild(address);

        let values = document.createElement('td');
        switch (action.type) {
            case roscopb.ScriptActionType.ActionTypeSet:
                values.innerText = `${action.values[0].value.case}/${action.values[0].value.value}`;
                break;
            case roscopb.ScriptActionType.ActionTypeFade:
                values.innerText = `${action.values[0].value.value} -> ${action.values[1].value.value}`;
                break;
            case roscopb.ScriptActionType.ActionTypeSleep:
                values.innerText = '';
                break;
        }
        tr.appendChild(values);

        let duration = document.createElement('td');
        duration.innerText = action.durationMs ? action.durationMs.toString() : '';
        tr.appendChild(duration);

        let controls = document.createElement('td');
        tr.appendChild(controls);
        return tr;
    }
}
customElements.define('rosco-script-action-table', ScriptActionTable);

class ScriptEdit extends HTMLElement {
    private _dialog: HTMLDialogElement;
    private _button_cancel: HTMLButtonElement;
    private _button_new: HTMLButtonElement;
    private _action_edit: ScriptActionEdit;
    private _script_action_table: ScriptActionTable;

    private _script = new roscopb.Script();

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
<dialog>

<label for="input-name">Name</label>
<input type="text" id="input-name" />

<fieldset>
    <legend>Actions</legend>
    <rosco-script-action-table></rosco-script-action-table>
</fieldset>
<div>
    <button id="btn-new">New Action</button>
</div>
<button>Save</button>
<button id="btn-cancel">Cancel</button>

<rosco-script-action-edit></rosco-script-action-edit>
</dialog>
`;
        this._dialog = this.shadowRoot.querySelector('dialog');
        this._button_cancel = this.shadowRoot.querySelector('#btn-cancel');
        this._button_cancel.addEventListener('click', () => this._onCancel());
        this._button_new = this.shadowRoot.querySelector('#btn-new');
        this._button_new.addEventListener('click', () => this._onNewAction());

        this._action_edit = this.shadowRoot.querySelector('rosco-script-action-edit') as ScriptActionEdit;
        this._script_action_table = this.shadowRoot.querySelector('rosco-script-action-table') as ScriptActionTable;
    }

    private _onCancel() {
        this._dialog.close();
    }

    private _onNewAction() {
        this._editAction(0, new roscopb.ScriptAction());
    }

    private _editAction(id: number, action: roscopb.ScriptAction) {
        this._action_edit.action = action;
        this._action_edit.onSave = (newAction: roscopb.ScriptAction) => {
            this._script.actions.push(newAction);
            this._script_action_table.actions = this._script.actions;
        };
        this._action_edit.showModal();
    }

    showModal() {
        this._dialog.showModal();
    }
}

export { ScriptEdit };