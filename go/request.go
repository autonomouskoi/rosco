package rosco

import (
	"github.com/autonomouskoi/core-tinygo"
)

func (rsc *Rosco) handleRequests() core.TypeRouter {
	return core.TypeRouter{
		int32(MessageTypeRequest_CONFIG_GET_REQ): rsc.handleRequestConfigGet,
		int32(MessageTypeRequest_SCRIPT_RUN_REQ): rsc.handleRequestRunScript,
	}
}

func (rsc *Rosco) handleRequestConfigGet(msg *core.BusMessage) *core.BusMessage {
	reply := core.DefaultReply(msg)
	core.MarshalMessage(reply, &ConfigGetResponse{
		Config: rsc.cfg,
	})
	return reply
}

func (rsc *Rosco) handleRequestRunScript(msg *core.BusMessage) *core.BusMessage {
	reply := core.DefaultReply(msg)
	rsr := &ScriptRunRequest{}
	reply.Error = core.UnmarshalMessage(msg, rsr)
	if reply.Error != nil {
		core.LogBusError("unmarshalling", reply.Error)
		return reply
	}

	// Do the thing
	actions := rsr.GetScript().GetActions()
	if len(actions) == 0 {
		script := rsc.cfg.GetScripts()[rsr.GetScriptId()]
		if script == nil {
			reply.Error = core.NotFoundError()
			core.LogError("no script", "id", rsr.GetScriptId())
			return reply
		}
		actions = script.GetActions()
	}
	if len(actions) == 0 {
		reply.Error = &core.Error{
			Code:   int32(core.CommonErrorCode_BAD_REQUEST),
			Detail: core.String("script has no actions"),
		}
		return reply
	}

	rsc.runScript(rsr.GetTarget(), actions)

	core.MarshalMessage(reply, &ScriptRunResponse{})
	return reply
}
