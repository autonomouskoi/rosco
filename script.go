package rosco

import (
	"fmt"
	"time"

	"google.golang.org/protobuf/proto"

	"github.com/autonomouskoi/akcore/bus"
	"github.com/hypebeast/go-osc/osc"
)

func (rsc *Rosco) handleRequestRunScript(msg *bus.BusMessage) *bus.BusMessage {
	rsc.Log.Debug("handling run script")
	reply := &bus.BusMessage{
		Topic: msg.GetTopic(),
		Type:  msg.Type + 1,
	}
	rsr := &ScriptRunRequest{}
	reply.Error = rsc.UnmarshalMessage(msg, rsr)
	if reply.Error != nil {
		return reply
	}

	script := rsr.Script
	if script == nil {
		rsc.lock.Lock()
		script = rsc.cfg.Scripts[rsr.ScriptId]
		rsc.lock.Unlock()
	}
	if script == nil {
		reply.Error = &bus.Error{
			Code:        int32(bus.CommonErrorCode_INVALID_TYPE),
			UserMessage: proto.String("invalid script ID"),
		}
		return reply
	}

	if reply.Error = rsc.runScript(rsr.Target, script); reply.Error != nil {
		return reply
	}
	rsc.MarshalMessage(reply, &ScriptRunResponse{})

	return reply
}

func (rsc *Rosco) runScript(targetID int32, script *Script) *bus.Error {
	rsc.Log.Debug("running script",
		"target_id", targetID,
		"script_name", script.Name,
	)
	for _, action := range script.Actions {
		switch action.Type {
		case ScriptActionType_ActionTypeSet:
			if busErr := rsc.sendMessage(targetID, action); busErr != nil {
				return busErr
			}
		case ScriptActionType_ActionTypeFade:
			rsc.fade(targetID, action)
		case ScriptActionType_ActionTypeSleep:
			time.Sleep(time.Millisecond * time.Duration(action.DurationMs))
		}
	}
	return nil
}

type messageable interface {
	GetAddress() string
	GetValues() []*OSCValue
}

func (rsc *Rosco) sendMessage(targetID int32, msgble messageable) *bus.Error {
	rsc.lock.Lock()
	client := rsc.clients[targetID]
	rsc.lock.Unlock()
	if client == nil {
		return &bus.Error{
			Code:   int32(bus.CommonErrorCode_INVALID_TYPE),
			Detail: proto.String(fmt.Sprintf("invalid target: %d", targetID)),
		}
	}

	oscMsg := osc.NewMessage(msgble.GetAddress())
	for _, oscVal := range msgble.GetValues() {
		var value any
		switch v := oscVal.Value.(type) {
		case *OSCValue_Nil:
			// value nil is desired
		case *OSCValue_Int32:
			value = v.Int32
		case *OSCValue_Float32:
			value = v.Float32
		case *OSCValue_String_:
			value = v.String_
		case *OSCValue_Blob:
			value = v.Blob
		case *OSCValue_Int64:
			value = v.Int64
		/*
			case *OSCValue_Time:
				value = v.Time
			case *OSCValue_Double:
				value = v.Double
		*/
		case *OSCValue_True:
			value = true
		case *OSCValue_False:
			value = false
		}
		oscMsg.Append(value)
	}
	rsc.Log.Debug("sending osc", "host", client.IP(), "osc", *oscMsg)
	if err := client.Send(oscMsg); err != nil {
		rsc.Log.Error("sending osc",
			"host", client.IP(),
			"port", client.Port(),
			"osc", *oscMsg,
			"error", err.Error(),
		)
		return &bus.Error{
			Code:   int32(bus.CommonErrorCode_UNKNOWN),
			Detail: proto.String("sending: " + err.Error()),
		}
	}
	return nil
}

func (rsc *Rosco) fade(targetID int32, action *ScriptAction) *bus.Error {
	if len(action.Values) < 2 {
		return nil
	}
	from := action.Values[0].Value.(*OSCValue_Float32).Float32
	to := action.Values[1].Value.(*OSCValue_Float32).Float32
	duration := time.Millisecond * time.Duration(action.DurationMs)
	timeSlice := duration / 60
	delta := (to - from) / float32(duration/timeSlice)
	cmp := func(a, b float32) bool {
		return a <= b
	}
	if delta < 0 {
		cmp = func(a, b float32) bool {
			return a >= b
		}
	}
	for v := from; cmp(v, to); v += delta {
		sa := &ScriptAction{
			Address: action.Address,
			Type:    ScriptActionType_ActionTypeSet,
			Values: []*OSCValue{
				{Value: &OSCValue_Float32{Float32: v}},
			},
		}
		if busErr := rsc.sendMessage(targetID, sa); busErr != nil {
			return busErr
		}
	}

	return nil
}
