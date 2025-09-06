import * as roscopb from '/m/rosco/pb/rosco_pb.js';
import { Controller } from './controller.js';
import { UpdatingControlPanel } from '/tk.js';
import { EVENT_RUN, EVENT_UPDATE } from './script_edit.js';

let help = document.createElement('div');
help.innerHTML = `
<p>
<em>Scripts</em> are predefined sets of actions to perform. These include setting an OSC value,
sleeping to delay the next action, and fading smoothly between two values over time. Click the
<code>+</code> button to create a new script. Clicking the <code>Import</code> button will
present a dialog where you can paste a script that's been exported to a text form. Completing
the import will open the imported script in the script editor; it is not yet saved.
</p>

<p>
Each script is presented in a table listing the name of the script, how many actions are in the
script, and show operations you can perform on the script. <code>Edit</code> will open the script
in the editor. <code>Delete</code> will delete the script after a confirmation step. <code>Run
</code> will run the script using the <em>Target</em> selected in the <em>Send Test Message</em>
control. <code>Export</code> will convert the script into a format you can share with others,
copying it to the clipboard.
</p>

<p>
Editing a script is done through a drag-and-drop interface. The left hand side is a toolbox with
operations. <em>Run</em> will execute the script in the editor against the <em>Target</em> selected
in the <em>Send Test Message</em> control. <em>Save</em> will save the script and close the editor,
<em>Cancel</em> will close the editor without saving.
</p>

<p>
Next are the <em>Script Components</em> which are all blue. A <em>Script</em> has a name and
a series of <em>Script Actions</em> to perform. You should have only one Script in the editor at a
time. The other Script Components are actions that the script can perform. Drag actions from the
toolbox and drop them in the script so that the notches align. You can:
<ul>
    <li>drop a new script action above or below existing actions in the script</li>
    <li>grab an action in the script and move it above or below other actions to change their order</li>
    <li>grab an action and drop it in the white area outside the script</li>
    <li>grab an action and drop it on the toolbox to delete it</li>
</ul>
</p>

<p>
A <em>Script Action Set</em> component will send one OSC message to set a <em>Value</em> on an
<em>Address</em>. This requires an <em>OSC Value</em> component, explained below.
</p>

<p>
A <em>Script Action Sleep</em> component will cause the script to wait a certain amount of time
before taking the next step. The duration of the sleep is specified in milliseconds (ms) where one
second is 1,000 milliseconds.
</p>

<p>
A <em>Script Action Fade</em> component will repeatedly send OSC messages to set a value on an
<em>Address</em>, adjusting it smoothly over time. The <em>From</em> and <em>To</em> are float32
values specifying the starting and ending value, respectively. <em>Duration</em> specifies how
it should take to go from the <em>From</em> value to the <em>To</em> value, in milliseconds (ms)
where one second is 1,000 milliseconds. Messages are sent 60 times per second.
</p>

<p>
In the toolbox below the <em>Script Components</em> are <em>OSC Values</em>. These are dropped
into the <em>Value</em> slots of <em>Script Action Set</em> components to specify the value the
<em>Address</em> should be set to.
</p>
`;

class Scripts extends UpdatingControlPanel<roscopb.Config> {
    private _table: HTMLDivElement;

    private _ctrl: Controller;

    constructor(ctrl: Controller) {
        super({ title: 'Scripts', help, data: ctrl.cfg });
        this._ctrl = ctrl;

        this.innerHTML = `
<div id="table" class="grid-3-col">
    <div class="column-header">Name</div>
    <div class="column-header">Actions</div>
    <div class="column-header">
        <button type="button" id="new">+</button>
        <button type="button" id="import">Import</button>
    </div>
</div>`;
        this._table = this.querySelector('div#table');
        let dialogImport = new ImportDialog();
        dialogImport.import = (script: roscopb.Script) => this._editScript(0, script);
        this.appendChild(dialogImport);

        let newButton = this.querySelector('button#new');
        newButton.addEventListener('click', () => {
            let script = new roscopb.Script({ name: 'new script' });
            this._editScript(0, script);
        });
        let buttonImport = this.querySelector('button#import');
        buttonImport.addEventListener('click', () => dialogImport.showModal());
        this.update(ctrl.cfg.last);
    }

    update(cfg: roscopb.Config) {
        this._table.querySelectorAll('div:not(.column-header)').forEach((elem) => {
            this._table.removeChild(elem);
        });
        for (let idStr of Object.keys(cfg.scripts)) {
            let id = parseInt(idStr);
            this._addScriptToTable(id, cfg.scripts[id]);
        }
    }

    private _addScriptToTable(id: number, script: roscopb.Script) {
        let nameDiv = document.createElement('div');
        nameDiv.innerText = script.name;
        this._table.appendChild(nameDiv);
        let actionsDiv = document.createElement('div');
        actionsDiv.innerText = script.actions.length.toString();
        this._table.appendChild(actionsDiv);

        let buttonsDiv = document.createElement('div');
        addAButton('Edit', 'Open the script in the editor', buttonsDiv)
            .addEventListener('click', () => {
                this._editScript(id, script);
            });

        addAButton('Delete', 'Delete this script', buttonsDiv)
            .addEventListener('click', () => {
                if (confirm(`Really delete ${script.name}?`)) {
                    let scripts = this._ctrl.scripts.last;
                    delete (scripts[id]);
                    this._ctrl.scripts.save(scripts);
                }
            });

        addAButton('Run', 'Run this script using the target selected in Send Test Message', buttonsDiv)
            .addEventListener('click', () => {
                this._ctrl.runScript(id);
            });

        addAButton('Export', 'Export this script to the clipboard', buttonsDiv)
            .addEventListener('click', (e) => {
                if (!navigator.clipboard) {
                    return;
                }
                let button = e.target as HTMLButtonElement;
                navigator.clipboard.writeText(script.toJsonString()).then(() => {
                    button.innerText = 'Copied to Clipboard!';
                    setTimeout(() => { button.innerText = 'Export' }, 5000);
                });
            });

        this._table.appendChild(buttonsDiv);
    }

    private _editScript(id: number, script: roscopb.Script) {
        let blarg = script.toJsonString();
        let wp = window.open(`/m/rosco/script_edit.html#${btoa(blarg)}`, '_blank');
        wp.addEventListener(EVENT_UPDATE, (e: CustomEvent) => {
            let script: roscopb.Script = e.detail;
            this._saveScript(id, script);
            wp.close();
        })
        wp.addEventListener(EVENT_RUN, (e: CustomEvent) => {
            let script: roscopb.Script = e.detail;
            this._runScript(script);
        })
    }

    private _saveScript(id: number, script: roscopb.Script) {
        id = id ? id : Math.floor(Math.random() * 0x7fffffff);
        let cfg = this._ctrl.cfg.last.clone();
        cfg.scripts[id] = script;
        this.save(cfg);
    }

    private _runScript(script: roscopb.Script) {
        console.log(`Running script ${script.name}`);
        this._ctrl.runScript(script);
    }
}
customElements.define('rosco-scripts', Scripts, { extends: 'fieldset' });

class ImportDialog extends HTMLDialogElement {
    private _textarea: HTMLTextAreaElement;
    private _btn_cancel: HTMLButtonElement;
    private _btn_import: HTMLButtonElement;

    import = (script: roscopb.Script) => { };

    constructor() {
        super();

        this.innerHTML = `
<h1>Import Script</h1>
<textarea
    rows="10"
    cols="60"
></textarea>
<div>
    <button id="import" type="button">Import</button>
    <button id="cancel" type="button">Cancel</button>
</div>
`;

        this._textarea = this.querySelector('textarea');
        this._btn_cancel = this.querySelector('#cancel');
        this._btn_cancel.addEventListener('click', () => this._cancel());
        this._btn_import = this.querySelector('#import');
        this._btn_import.addEventListener('click', () => this._import());
    }

    private _cancel() {
        this._textarea.value = '';
        this.close();
    }

    private _import() {
        let script: roscopb.Script
        try {
            script = roscopb.Script.fromJsonString(this._textarea.value);
        } catch (e) {
            alert('invalid script');
            return;
        }
        this.import(script);
        this._cancel();
    }
}
customElements.define('rosco-import-dialog', ImportDialog, { extends: 'dialog' });

function addAButton(text: string, title: string, parent: HTMLElement): HTMLButtonElement {
    let button = document.createElement('button');
    button.type = 'button';
    button.innerText = text;
    button.title = title;
    parent.appendChild(button);
    return button;
}

export { Scripts };