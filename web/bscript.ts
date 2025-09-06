import * as Blockly from 'blockly';
import * as blocks from './bscript_blocks.js';

import * as roscopb from '/m/rosco/pb/rosco_pb.js';
import { EVENT_RUN, EVENT_UPDATE } from './script_edit.js';

Blockly.common.defineBlocks(blocks.blocks);

class ScriptEditor extends HTMLElement {
    private _blocklyDiv: HTMLElement;

    constructor(blocklyDiv: HTMLElement) {
        super();
        this._blocklyDiv = blocklyDiv;
        let script = roscopb.Script.fromJsonString(atob(window.location.hash.slice(1)));
        this._setScript(script);
    }

    private _cancelEdit() {
        window.close();
    }

    private _setScript(script: roscopb.Script) {
        const blocklyArea = document.getElementById('blocklyArea');
        this._blocklyDiv.textContent = '';
        const ws = Blockly.inject(this._blocklyDiv, {
            collapse: true,
            move: {
                scrollbars: {
                    vertical: true,
                },
            },
            toolbox: blocks.toolbox,
        });
        let onresize = () => {
            // Compute the absolute coordinates and dimensions of blocklyArea.
            let element = blocklyArea;
            let x = 0;
            let y = 0;
            do {
                x += element.offsetLeft;
                y += element.offsetTop;
                element = element.offsetParent as HTMLElement;
            } while (element);
            // Position blocklyDiv over blocklyArea.
            this._blocklyDiv.style.left = x + 'px';
            this._blocklyDiv.style.top = y + 'px';
            this._blocklyDiv.style.width = blocklyArea.offsetWidth + 'px';
            this._blocklyDiv.style.height = blocklyArea.offsetHeight + 'px';
            Blockly.svgResize(ws);
        };
        window.addEventListener('resize', onresize, false);
        onresize();

        ws.registerButtonCallback(blocks.CALLBACK_KEY_CANCEL, () => {
            this._cancelEdit();
        });
        ws.registerButtonCallback(blocks.CALLBACK_KEY_SAVE, () => {
            let json = blocks.generator.workspaceToCode(ws);
            try {
                let script = roscopb.Script.fromJsonString(json);
                window.dispatchEvent(new CustomEvent(EVENT_UPDATE, {
                    detail: script,
                }));
            } catch (e) {
                console.log(`error generating script proto: ` + e);
            }
        });
        ws.registerButtonCallback(blocks.CALLBACK_KEY_RUN, () => {
            let json = blocks.generator.workspaceToCode(ws);
            try {
                let script = roscopb.Script.fromJsonString(json);
                window.dispatchEvent(new CustomEvent(EVENT_RUN, {
                    detail: script,
                }));
            } catch (e) {
                console.log(`error generating script proto: ` + e);
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