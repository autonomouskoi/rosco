package rosco

import (
	"github.com/autonomouskoi/core-tinygo"
	"github.com/autonomouskoi/core-tinygo/svc"
)

const (
	fadeStepIntervalMS = 1000 / 60 // ~60fps
)

type fadeStep struct {
	startTime, endTime int64
	fromValue, toValue float64
	address            string
}

func newFadeStep(step *ScriptAction) *fadeStep {
	if len(step.Values) < 2 {
		return nil
	}
	fs := &fadeStep{
		endTime: int64(step.DurationMs),
		address: step.GetAddress(),
	}
	from, ok := step.Values[0].Value.(*OSCValue_Float32)
	if !ok {
		return nil
	}
	fs.fromValue = float64(from.Float32)
	to, ok := step.Values[1].Value.(*OSCValue_Float32)
	if !ok {
		return nil
	}
	fs.toValue = float64(to.Float32)
	return fs
}

type scriptRunner struct {
	target      string
	nextAfter   int64
	currentFade *fadeStep
	steps       []*ScriptAction
}

func newScriptRunner(target string, actions []*ScriptAction) *scriptRunner {
	return &scriptRunner{
		target: target,
		steps:  actions,
	}
}

func (sr *scriptRunner) next(now int64) bool {
	if sr.currentFade == nil && len(sr.steps) == 0 {
		return true
	}
	if sr.nextAfter >= now {
		return false
	}
	if sr.currentFade != nil {
		sr.doFade(now)
		return false
	}
	sr.doStep(now)
	return false
}

func (sr *scriptRunner) doFade(now int64) {
	if sr.currentFade.startTime == 0 {
		sr.currentFade.startTime = now
		sr.currentFade.endTime = now + sr.currentFade.endTime
	}
	if sr.currentFade.endTime < now {
		sendMessage(sr.target, sr.currentFade.address, []*OSCValue{
			{
				Value: &OSCValue_Float32{Float32: float32(sr.currentFade.toValue)},
			},
		})
		sr.currentFade = nil
		return
	}
	startF32 := float64(sr.currentFade.startTime)
	progress := (float64(now) - startF32) / (float64(sr.currentFade.endTime) - startF32)
	vDelta := sr.currentFade.toValue - sr.currentFade.fromValue
	currentValue := vDelta*progress + sr.currentFade.fromValue
	sendMessage(sr.target, sr.currentFade.address, []*OSCValue{
		{
			Value: &OSCValue_Float32{Float32: float32(currentValue)},
		},
	})
	sr.nextAfter = now + fadeStepIntervalMS
}

func (sr *scriptRunner) doStep(now int64) {
	// do the step
	step := sr.steps[0]
	switch step.Type {
	case ScriptActionType_ActionTypeFade:
		sr.currentFade = newFadeStep(step)
	case ScriptActionType_ActionTypeSet:
		sendMessage(sr.target, step.GetAddress(), step.GetValues())
	case ScriptActionType_ActionTypeSleep:
		sr.nextAfter = now + int64(step.DurationMs)
	}
	sr.steps = sr.steps[1:]
}

func sendMessage(target, address string, values []*OSCValue) {
	svcValues := make([]*svc.OSCValue, len(values))
	for i, v := range values {
		sv := &svc.OSCValue{}
		switch vv := v.Value.(type) {
		case *OSCValue_Nil:
			sv.Value = &svc.OSCValue_Nil{Nil: vv.Nil}
		case *OSCValue_Int32:
			sv.Value = &svc.OSCValue_Int32{Int32: vv.Int32}
		case *OSCValue_Float32:
			sv.Value = &svc.OSCValue_Float32{Float32: vv.Float32}
		case *OSCValue_String_:
			sv.Value = &svc.OSCValue_String_{String_: vv.String_}
		case *OSCValue_Blob:
			sv.Value = &svc.OSCValue_Blob{Blob: vv.Blob}
		case *OSCValue_Int64:
			sv.Value = &svc.OSCValue_Int64{Int64: vv.Int64}
		case *OSCValue_True:
			sv.Value = &svc.OSCValue_True{True: vv.True}
		case *OSCValue_False:
			sv.Value = &svc.OSCValue_False{False: vv.False}
		}
		svcValues[i] = sv
	}
	sr := svc.OSCSendMessageRequest{
		TargetName: target,
		Address:    address,
		Values:     svcValues,
	}
	msg := &core.BusMessage{
		Type: int32(svc.MessageType_OSC_SEND_MESSAGE_REQ),
	}
	if core.MarshalMessage(msg, &sr); msg.Error != nil {
		return
	}
	reply, err := core.WaitForReply(msg, 1000)
	if err != nil {
		core.LogError("sending OSC message", "target", target, "error", err.Error())
		return
	}
	if reply.Error != nil {
		core.LogBusError("sending OSC message", reply.Error)
	}
}

func (rsc *Rosco) triggerScriptSteps(currentTimeMillis int64) {
	for i, sr := range rsc.runners {
		if done := sr.next(currentTimeMillis); done {
			delete(rsc.runners, i)
		}
	}
}

func (rsc *Rosco) runScript(target string, actions []*ScriptAction) {
	rsc.runners[rsc.runnerCount] = newScriptRunner(target, actions)
	rsc.runnerCount++
}
