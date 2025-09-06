import * as Blockly from 'blockly';
import * as roscopb from '/m/rosco/pb/rosco_pb.js';

const BLOCK_TYPE_OSC_NIL = 'osc_nil';
const BLOCK_TYPE_OSC_INT32 = 'osc_int32';
const BLOCK_TYPE_OSC_FLOAT32 = 'osc_float32';
const BLOCK_TYPE_OSC_STRING = 'osc_string';
const BLOCK_TYPE_OSC_INT64 = 'osc_int64';
const BLOCK_TYPE_OSC_TRUE = 'osc_true';
const BLOCK_TYPE_OSC_FALSE = 'osc_false';
const BLOCK_TYPE_SCRIPT = 'script';
const BLOCK_TYPE_SCRIPT_ACTION_SET = 'script_action_set';
const BLOCK_TYPE_SCRIPT_ACTION_FADE = 'script_action_fade';
const BLOCK_TYPE_SCRIPT_ACTION_SLEEP = 'script_action_sleep';

const FIELD_NAME_ACTIONS = 'ACTIONS';
const FIELD_NAME_ADDRESS = 'ADDRESS';
const FIELD_NAME_DURATION = 'DURATION';
const FIELD_NAME_FROM = 'FROM';
const FIELD_NAME_NAME = 'NAME';
const FIELD_NAME_OSC_VALUE = 'OSC_VALUE';
const FIELD_NAME_TO = 'TO';
const FIELD_NAME_TYPE = 'TYPE';
const FIELD_NAME_VALUE = 'VALUE';

const CALLBACK_KEY_CANCEL = 'CANCEL';
const CALLBACK_KEY_RUN = 'RUN';
const CALLBACK_KEY_SAVE = 'SAVE';

const CONNECT_SET_ACTION = 'set_action';
const CONNECT_OSC_VALUE = 'osc_value';

const blocks = Blockly.common.createBlockDefinitionsFromJsonArray([
    {
        "type": BLOCK_TYPE_SCRIPT,
        "message0": "Script %1\nActions: %2",
        "args0": [
            {
                "type": "field_input",
                "name": FIELD_NAME_NAME,
                "text": "new script",
            },
            {
                "type": "input_statement",
                "name": FIELD_NAME_ACTIONS,
                "check": CONNECT_SET_ACTION,
            },
        ],
        "colour": '210',
    },
    {
        "type": BLOCK_TYPE_SCRIPT_ACTION_SET,
        "message0": "Script Action Set\nAddress: %1\nValue: %2",
        "args0": [
            {
                "type": "field_input",
                "name": FIELD_NAME_ADDRESS,
                "text": "",
            },
            {
                "type": "input_value",
                "name": FIELD_NAME_OSC_VALUE,
                "check": CONNECT_OSC_VALUE,
            },
        ],
        "previousStatement": CONNECT_SET_ACTION,
        "nextStatement": CONNECT_SET_ACTION,
        "colour": '210',
    },
    {
        "type": BLOCK_TYPE_SCRIPT_ACTION_FADE,
        "message0": "Script Action Fade\nAddress: %1\nFrom: %2\nTo: %3\nDuration (ms): %4",
        "args0": [
            {
                "type": "field_input",
                "name": FIELD_NAME_ADDRESS,
                "text": "",
            },
            {
                "type": "field_number",
                "name": FIELD_NAME_FROM,
            },
            {
                "type": "field_number",
                "name": FIELD_NAME_TO,
            },
            {
                "type": "field_number",
                "name": FIELD_NAME_DURATION,
            },
        ],
        "previousStatement": CONNECT_SET_ACTION,
        "nextStatement": CONNECT_SET_ACTION,
        "colour": '210',
    },
    {
        "type": BLOCK_TYPE_SCRIPT_ACTION_SLEEP,
        "message0": "Script Action Sleep\nDuration (ms): %1",
        "args0": [
            {
                "type": "field_number",
                "name": FIELD_NAME_DURATION,
                "text": "",
            },
        ],
        "previousStatement": CONNECT_SET_ACTION,
        "nextStatement": CONNECT_SET_ACTION,
        "colour": '210',
    },
    {
        "type": BLOCK_TYPE_OSC_NIL,
        "message0": "nil",
        "output": CONNECT_OSC_VALUE,
        "colour": "120",
    },
    {
        "type": BLOCK_TYPE_OSC_INT32,
        "message0": "int32: %1",
        "args0": [
            {
                "type": "field_number",
                "name": FIELD_NAME_VALUE,
                "text": "0",
            }
        ],
        "output": CONNECT_OSC_VALUE,
        "colour": "120",
    },
    {
        "type": BLOCK_TYPE_OSC_FLOAT32,
        "message0": "float32: %1",
        "args0": [
            {
                "type": "field_number",
                "name": FIELD_NAME_VALUE,
                "text": "0.0",
            }
        ],
        "output": CONNECT_OSC_VALUE,
        "colour": "120",
    },
    {
        "type": BLOCK_TYPE_OSC_STRING,
        "message0": 'string: "%1"',
        "args0": [
            {
                "type": "field_input",
                "name": FIELD_NAME_VALUE,
            }
        ],
        "output": CONNECT_OSC_VALUE,
        "colour": "120",
    },
    {
        "type": BLOCK_TYPE_OSC_INT64,
        "message0": "int64: %1",
        "args0": [
            {
                "type": "field_number",
                "name": FIELD_NAME_VALUE,
                "text": "0",
            }
        ],
        "output": CONNECT_OSC_VALUE,
        "colour": "120",
    },
    {
        "type": BLOCK_TYPE_OSC_TRUE,
        "message0": "true",
        "output": CONNECT_OSC_VALUE,
        "colour": "120",
    },
    {
        "type": BLOCK_TYPE_OSC_FALSE,
        "message0": "false",
        "output": CONNECT_OSC_VALUE,
        "colour": "120",
    },
]);

const generator = new Blockly.Generator('JSON');

const Order = {
    ATOMIC: 0,
};

generator.forBlock[BLOCK_TYPE_OSC_NIL] = function (block, generator) {
    return [`{"nil": 0}`, Order.ATOMIC];
}

generator.forBlock[BLOCK_TYPE_OSC_INT32] = function (block, generator) {
    const value = block.getFieldValue(FIELD_NAME_VALUE);
    return [`{"int32": ${value}}`, Order.ATOMIC];
}

generator.forBlock[BLOCK_TYPE_OSC_FLOAT32] = function (block, generator) {
    const value = block.getFieldValue(FIELD_NAME_VALUE);
    return [`{"float32": ${value}}`, Order.ATOMIC];
}

generator.forBlock[BLOCK_TYPE_OSC_STRING] = function (block, generator) {
    const value = block.getFieldValue(FIELD_NAME_VALUE);
    return [`{"string": ${JSON.stringify(value)}}`, Order.ATOMIC];
}

generator.forBlock[BLOCK_TYPE_OSC_INT64] = function (block, generator) {
    const value = block.getFieldValue(FIELD_NAME_VALUE);
    return [`{"int64": ${value}}`, Order.ATOMIC];
}

generator.forBlock[BLOCK_TYPE_OSC_TRUE] = function (block, generator) {
    return [`{"true": 0}`, Order.ATOMIC];
}

generator.forBlock[BLOCK_TYPE_OSC_FALSE] = function (block, generator) {
    return [`{"false": 0}`, Order.ATOMIC];
}

generator.forBlock[BLOCK_TYPE_SCRIPT_ACTION_SET] = function (block, generator) {
    const address = block.getFieldValue(FIELD_NAME_ADDRESS);
    const value = generator.valueToCode(block, FIELD_NAME_OSC_VALUE, Order.ATOMIC);
    return `{
    "type": ${roscopb.ScriptActionType.ActionTypeSet},
    "address": ${JSON.stringify(address)},
    "values": [
        ${value}
    ]
}`;
}

generator.forBlock[BLOCK_TYPE_SCRIPT_ACTION_FADE] = function (block, generator) {
    const address = block.getFieldValue(FIELD_NAME_ADDRESS);
    const from = block.getFieldValue(FIELD_NAME_FROM);
    const to = block.getFieldValue(FIELD_NAME_TO);
    const duration = block.getFieldValue(FIELD_NAME_DURATION);
    return `{
    "type": ${roscopb.ScriptActionType.ActionTypeFade},
    "address": ${JSON.stringify(address)},
    "values": [
        {"float32": ${from}},
        {"float32": ${to}}
    ],
    "duration_ms": ${duration}
}`;
}

generator.forBlock[BLOCK_TYPE_SCRIPT_ACTION_SLEEP] = function (block, generator) {
    const duration = block.getFieldValue(FIELD_NAME_DURATION);
    return `{
    "type": ${roscopb.ScriptActionType.ActionTypeSleep},
    "duration_ms": ${duration}
}`;
}

generator.forBlock[BLOCK_TYPE_SCRIPT] = function (block, generator) {
    const name = block.getFieldValue(FIELD_NAME_NAME);
    const actions = generator.statementToCode(block, FIELD_NAME_ACTIONS);
    return `
{
    "name": ${JSON.stringify(name)},
    "actions": [
        ${actions}
    ]
}`;
}

generator.scrub_ = function (block, code, thisOnly) {
    const nextBlock =
        block.nextConnection && block.nextConnection.targetBlock();
    if (nextBlock && !thisOnly) {
        return code + ',\n' + generator.blockToCode(nextBlock);
    }
    return code;
};

const toolbox = {
    'kind': 'flyoutToolbox',
    'contents': [
        {
            'kind': 'button',
            'text': 'Run',
            'callbackKey': CALLBACK_KEY_RUN,
        },
        {
            'kind': 'button',
            'text': 'Save',
            'callbackKey': CALLBACK_KEY_SAVE,
        },
        {
            'kind': 'button',
            'text': 'Cancel',
            'callbackKey': CALLBACK_KEY_CANCEL,
        },
        {
            'kind': 'label',
            'text': 'Script Components',
        },
        {
            'kind': 'block',
            'type': BLOCK_TYPE_SCRIPT,
        },
        {
            'kind': 'block',
            'type': BLOCK_TYPE_SCRIPT_ACTION_SET,
        },
        {
            'kind': 'block',
            'type': BLOCK_TYPE_SCRIPT_ACTION_FADE,
        },
        {
            'kind': 'block',
            'type': BLOCK_TYPE_SCRIPT_ACTION_SLEEP,
        },
        {
            'kind': 'label',
            'text': 'OSC Values',
        },
        {
            'kind': 'block',
            'type': BLOCK_TYPE_OSC_NIL,
        },
        {
            'kind': 'block',
            'type': BLOCK_TYPE_OSC_TRUE,
        },
        {
            'kind': 'block',
            'type': BLOCK_TYPE_OSC_FALSE,
        },
        {
            'kind': 'block',
            'type': BLOCK_TYPE_OSC_INT32,
        },
        {
            'kind': 'block',
            'type': BLOCK_TYPE_OSC_INT64,
        },
        {
            'kind': 'block',
            'type': BLOCK_TYPE_OSC_FLOAT32,
        },
        {
            'kind': 'block',
            'type': BLOCK_TYPE_OSC_STRING,
        },
    ],
};

export {
    blocks, generator, toolbox,
    BLOCK_TYPE_OSC_NIL,
    BLOCK_TYPE_OSC_INT32,
    BLOCK_TYPE_OSC_FLOAT32,
    BLOCK_TYPE_OSC_STRING,
    BLOCK_TYPE_OSC_INT64,
    BLOCK_TYPE_OSC_TRUE,
    BLOCK_TYPE_OSC_FALSE,
    BLOCK_TYPE_SCRIPT,
    BLOCK_TYPE_SCRIPT_ACTION_SET,
    BLOCK_TYPE_SCRIPT_ACTION_FADE,
    BLOCK_TYPE_SCRIPT_ACTION_SLEEP,
    CALLBACK_KEY_CANCEL,
    CALLBACK_KEY_RUN,
    CALLBACK_KEY_SAVE,
    FIELD_NAME_ACTIONS,
    FIELD_NAME_ADDRESS,
    FIELD_NAME_DURATION,
    FIELD_NAME_FROM,
    FIELD_NAME_OSC_VALUE,
    FIELD_NAME_NAME,
    FIELD_NAME_TO,
    FIELD_NAME_TYPE,
    FIELD_NAME_VALUE,
};