import * as roscopb from '/m/rosco/pb/rosco_pb.js';
import { OSCTargetSelect } from '/tk.js';
import { Controller } from "./controller.js";

class Sender extends HTMLElement {
    private _ctrl: Controller;
    private _button_send: HTMLButtonElement;
    private _input_address: HTMLInputElement;
    private _input_value: HTMLInputElement;
    private _select_target: OSCTargetSelect;
    private _select_type: HTMLSelectElement;

    constructor(ctrl: Controller) {
        super();
        let targetTitle = 'Target to send OSC test messages to during test runs';
        let addressTitle = 'Address (variable) for OSC values';

        this.innerHTML = `
<style>
#fields-grid {
    display: grid;
    grid-template-columns: max-content max-content;
    column-gap: 0.75rem;
}
</style>
<fieldset>
<legend>Send Test Message</legend>

<div id="fields-grid">
    <label for="select-target" title="${targetTitle}">Target</label>

    <label for="input-address" title="${addressTitle}">Address</label>
    <input type="text" id="input-address" title="${addressTitle}"
        placeholder="/osc/foo"
    />

    <select id="select-type" title="value type">
        <option>Nil</option>
        <option>int32</option>
        <option>float32</option>
        <option>string</option>
        <option>blob</option>
        <option>int64</option>
        <option>time</option>
        <option>double</option>
        <option>true</option>
        <option>false</option>
    </select>
    <input type="text" id="input-value" title="value to send" />

    <button id="btn-send" type="button">Send</button>
</div>

</select>
</fieldset>
`;
        this._ctrl = ctrl;
        this._button_send = this.querySelector('#btn-send');
        this._button_send.addEventListener('click', () => this._send());
        this._input_address = this.querySelector('#input-address');
        this._input_value = this.querySelector('#input-value');
        this._select_type = this.querySelector('#select-type');

        this._select_target = new OSCTargetSelect();
        this._select_target.id = 'select-target';
        this._select_target.title = targetTitle;
        this._select_target.addEventListener('input', () => this._targetUpdate());
        this._select_target.ready.then(() => this._targetUpdate());
        this.querySelector('label[for="select-target"]').after(this._select_target);
    }

    private _targetUpdate() {
        this._ctrl.testTarget = this._select_target.value;
    }

    private _send() {
        let value = new roscopb.OSCValue();
        let inputValue = this._input_value.value;
        switch (this._select_type.value) {
            case 'Nil':
                value.value = { case: 'nil', value: 0 };
                break;
            case 'int32':
                value.value = { case: 'int32', value: parseInt(inputValue) };
                break;
            case 'float32':
                value.value = { case: 'float32', value: parseFloat(inputValue) };
                break;
            case 'string':
                value.value = { case: 'string', value: inputValue };
                break;
            case 'blob':
                value.value = { case: 'blob', value: new TextEncoder().encode(inputValue) };
                break;
            case 'int64':
                value.value = { case: 'int64', value: BigInt(inputValue) };
                break;
            case 'true':
                value.value = { case: 'true', value: false };
                break;
            case 'false':
                value.value = { case: 'true', value: false };
                break;
        }
        this._ctrl.sendOSC(this._input_address.value, value);
    }
}
customElements.define('rosco-sender-unused', Sender);

export { Sender };