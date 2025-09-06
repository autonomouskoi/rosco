import * as roscopb from '/m/rosco/pb/rosco_pb.js';

const PATTERN_FLOAT = '^[0-9]+([.][0-9]+)?$'
const PATTERN_INT = '^[0-9]+$'

class OSCAddress {
    private _label: HTMLLabelElement;
    private _input: HTMLInputElement;

    constructor() {
        let id = Math.random().toString();
        this._input = document.createElement('input');
        this._input.type = 'text';
        this._input.id = id;
        this._label = document.createElement('label');
        this._label.innerText = 'Address';
        this._label.setAttribute('for', id);
    }

    elements(): HTMLElement[] {
        return [this._label, this._input];
    }

    set value(v: string) {
        this._input.value = v;
    }

    get value(): string | undefined {
        if (this._input.value == '') {
            return undefined;
        }
        return this._input.value;
    }

    valid(): boolean {
        return this._input.checkValidity();
    }
}

class OSCValue {
    private _select: HTMLSelectElement;
    private _input: HTMLInputElement;

    constructor() {
        this._select = document.createElement('select');
        [
            'nil',
            'int32',
            'float32',
            'string',
            'blob',
            'int64',
            'time',
            'double',
            'true',
            'false',
        ].forEach((s) => {
            let opt = document.createElement('option');
            opt.innerText = s;
            this._select.appendChild(opt);
        });
        this._input = document.createElement('input');
        this._input.type = 'text';
        this._select.addEventListener('change', () => this._onSelectChange());
        this._onSelectChange();
    }

    elements(): HTMLElement[] {
        return [this._select, this._input];
    }

    private _onSelectChange() {
        this._input.value = '';
        switch(this._select.value) {
            case 'nil':
            case 'true':
            case 'false':
                this._input.required = false;
                this._input.pattern = undefined;
                break;
            case 'int32':
            case 'int64':
                this._input.required = true;
                this._input.pattern = PATTERN_INT;
                break;
            case 'float32':
            case 'double':
                this._input.required = true;
                this._input.pattern = PATTERN_FLOAT;
                break;
            case 'string':
                this._input.required = true;
                break;
        }
        this._input.disabled = !this._input.required;
    }

    set value(v: roscopb.OSCValue) {
        this._select.value = v.value.case;
        switch (v.value.case) {
            case 'nil':
            case 'true':
            case 'false':
                this._input.value = undefined;
                break;
            case 'int32':
            case 'float32':
            case 'int64':
                this._input.value = v.value.value.toString();
                break;
            case 'string':
                this._input.value = v.value.value;
                break;
            case 'blob':
                this._input.value = v.value.value.toString();
                break;
        }
    }

    get value(): roscopb.OSCValue | undefined {
        if (!this._input.checkValidity()) {
            return;
        }
        let value = new roscopb.OSCValue();
        let inputValue = this._input.value;
        switch (this._select.value) {
            case 'nil':
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
                value.value = { case: 'blob', value: new TextEncoder().encode(inputValue)};
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
        return value;
    }

    valid(): boolean {
        return this._input.checkValidity();
    }
}

class Duration {
    private _label: HTMLLabelElement;
    private _input: HTMLInputElement;

    constructor() {
        let id = Math.random().toString();
        this._input = document.createElement('input');
        this._input.type = 'text';
        this._input.pattern = PATTERN_INT;
        this._input.required = true;
        this._input.id = id;
        this._label = document.createElement('label');
        this._label.innerText = 'Duration (ms)';
        this._label.setAttribute('for', id);
    }

    elements(): HTMLElement[] {
        return [this._label, this._input];
    }

    set value(v: number) {
        this._input.value = v.toString();
    }

    get value(): number | undefined {
        if (!this._input.checkValidity()) {
            return undefined;
        }
        try {
            return parseInt(this._input.value);
        } catch {
            return undefined;
        }
    }

    valid(): boolean {
        return this._input.checkValidity();
    }
}

class FloatField {
    private _label: HTMLLabelElement;
    private _input: HTMLInputElement;

    constructor(label: string) {
        let id = Math.random().toString();
        this._input = document.createElement('input');
        this._input.type = 'text';
        this._input.id = id;
        this._input.pattern = PATTERN_FLOAT;
        this._label = document.createElement('label');
        this._label.innerText = label;
        this._label.setAttribute('for', id);
    }

    elements(): HTMLElement[] {
        return [this._label, this._input];
    }

    set value(v: roscopb.OSCValue) {
        switch (v.value.case) {
            case "float32":
            case "int32":
            case "int64":
                this._input.value = v.value.value.toString();
                break;
        }
    }

    get value(): roscopb.OSCValue | undefined {
        if (!this._input.checkValidity()) {
            return undefined;
        }
        try {
            let value = new roscopb.OSCValue();
            value.value = { case: 'float32', value: parseFloat(this._input.value) };
            return  value;
        } catch {
            return undefined;
        }
    }

    valid(): boolean {
        return this._input.checkValidity();
    }
}

export { Duration, FloatField, OSCAddress, OSCValue };