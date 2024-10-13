import * as Blockly from 'blockly';
import * as blocks from './bscript_blocks.js';

import * as roscopb from '/m/rosco/pb/rosco_pb.js';
import { Controller } from './controller.js';

Blockly.common.defineBlocks(blocks.blocks);

class ScriptEditor extends HTMLElement {
    private _mainContainer: HTMLElement;
    private _ctrl: Controller; 
    private _editingID: number;

    constructor(mainContainer: HTMLElement, ctrl: Controller) {
        super();
        this._mainContainer = mainContainer;
        this._ctrl = ctrl;
        ctrl.scriptEdit.subscribe((script) => {
            if (script.v !== undefined) {
                this._setScript(script.v);
                this._editingID = script.id;
            }
        });
    }

    private _cancelEdit() {
        this._ctrl.scriptEdit.update({ id: 0, v: undefined });
    }

    private _setScript(script: roscopb.Script) {
        this._mainContainer.textContent = '';
        const ws = Blockly.inject(this._mainContainer, {
            collapse: true,
            toolbox: blocks.toolbox,
        });

        ws.registerButtonCallback(blocks.CALLBACK_KEY_CANCEL, () => {
            this._cancelEdit();
        });
        ws.registerButtonCallback(blocks.CALLBACK_KEY_SAVE, () => {
            let json = blocks.generator.workspaceToCode(ws);
            try {
                let script = roscopb.Script.fromJsonString(json);
                let id = this._editingID ? this._editingID : Math.floor(Math.random() * 0xffff);
                let scripts = this._ctrl.scripts.last;
                scripts[id] = script;
                this._ctrl.scripts.save(scripts)
                    .then(() => this._cancelEdit());
            } catch (e) {
                console.log(`error generating script proto: `+e);
            }
        });
        ws.registerButtonCallback(blocks.CALLBACK_KEY_RUN, () => {
            let json = blocks.generator.workspaceToCode(ws);
            try {
                let script = roscopb.Script.fromJsonString(json);
                this._ctrl.runScript(script);
            } catch (e) {
                console.log(`error generating script proto: `+e);
            }

        });

        let scriptB = createScript(ws, script);
        scriptB.initSvg();
        scriptB.render();
        ws.render();
    }
}
customElements.define('rosco-script-edit', ScriptEditor);

function createScript(ws: Blockly.WorkspaceSvg, script: roscopb.Script): Blockly.BlockSvg {
    let scriptB = ws.newBlock(blocks.BLOCK_TYPE_SCRIPT);
    scriptB.setFieldValue(script.name, blocks.FIELD_NAME_NAME);

    let actionBlocks = script.actions.map((action) => {
        switch (action.type) {
            case roscopb.ScriptActionType.ActionTypeSet:
                return createScriptActionSet(ws, action);
            case roscopb.ScriptActionType.ActionTypeFade:
                return createScriptActionFade(ws, action);
            case roscopb.ScriptActionType.ActionTypeSleep:
                return createScriptActionSleep(ws, action);
            default:
                throw `Unhandled action type ${action.type}`;
        }
    });
    if (actionBlocks.length) {
        scriptB.getInput(blocks.FIELD_NAME_ACTIONS).connection.connect(actionBlocks[0].previousConnection);
        actionBlocks.reduce((prev, next) => {
            prev.nextConnection.connect(next.previousConnection);
            return next;
        });
        actionBlocks.forEach((block) => {
            block.initSvg();
            block.render();
        });
    }

    return scriptB;
}

function createScriptActionSet(ws: Blockly.WorkspaceSvg, action: roscopb.ScriptAction): Blockly.BlockSvg {
    let block = ws.newBlock(blocks.BLOCK_TYPE_SCRIPT_ACTION_SET);
    block.setFieldValue(action.address, blocks.FIELD_NAME_ADDRESS);

    if (action.values.length) {
        let valueBlock = createOSCValue(ws, action.values[0]);
        block.getInput(blocks.FIELD_NAME_OSC_VALUE).connection.connect(valueBlock.outputConnection);
        valueBlock.initSvg();
        valueBlock.render();
    }
    return block;
}

function createScriptActionFade(ws: Blockly.WorkspaceSvg, action: roscopb.ScriptAction): Blockly.BlockSvg {
    let block = ws.newBlock(blocks.BLOCK_TYPE_SCRIPT_ACTION_FADE);
    block.setFieldValue(action.address, blocks.FIELD_NAME_ADDRESS);

    if (action.values.length) {
        block.setFieldValue(action.values[0].value.value, blocks.FIELD_NAME_FROM);
    }
    if (action.values.length > 1) {
        block.setFieldValue(action.values[1].value.value, blocks.FIELD_NAME_TO);
    }
    block.setFieldValue(action.durationMs, blocks.FIELD_NAME_DURATION);

    return block;
}

function createScriptActionSleep(ws: Blockly.WorkspaceSvg, action: roscopb.ScriptAction): Blockly.BlockSvg {
    let block = ws.newBlock(blocks.BLOCK_TYPE_SCRIPT_ACTION_SLEEP);
    block.setFieldValue(action.durationMs, blocks.FIELD_NAME_DURATION);
    return block;
}

function createOSCValue(ws: Blockly.WorkspaceSvg, value: roscopb.OSCValue): Blockly.BlockSvg {
    // this will probably match
    let vType = 'osc_' + value.value.case;
    let block = ws.newBlock(vType);
    if (
        vType == blocks.BLOCK_TYPE_OSC_INT32
        || vType == blocks.BLOCK_TYPE_OSC_FLOAT32
        || vType == blocks.BLOCK_TYPE_OSC_STRING
        || vType == blocks.BLOCK_TYPE_OSC_INT64
    ) {
        block.setFieldValue(value.value.value, blocks.FIELD_NAME_VALUE);
    }

    return block;
}

export { ScriptEditor };