package rosco

import (
	"github.com/autonomouskoi/core-tinygo"
)

func (rsc *Rosco) handleCommands() core.TypeRouter {
	return core.TypeRouter{
		int32(MessageTypeCommand_CONFIG_SET_REQ): rsc.handleCommandConfigSet,
	}
}

func (rsc *Rosco) handleCommandConfigSet(msg *core.BusMessage) *core.BusMessage {
	reply := core.DefaultReply(msg)
	csr := &ConfigSetRequest{}
	if reply.Error = core.UnmarshalMessage(msg, csr); reply.Error != nil {
		return reply
	}
	rsc.cfg = csr.GetConfig()
	rsc.writeCfg()
	core.MarshalMessage(reply, &ConfigSetResponse{
		Config: rsc.cfg,
	})
	core.LogDebug("saved config")
	return reply
}
