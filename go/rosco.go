package rosco

import (
	"errors"
	"fmt"

	"github.com/autonomouskoi/akcore"
	"github.com/autonomouskoi/core-tinygo"
	"github.com/autonomouskoi/core-tinygo/svc"
)

var (
	cfgKVKey = []byte("config")
)

type Rosco struct {
	cfg         *Config
	router      core.TopicRouter
	runnerCount int
	runners     map[int]*scriptRunner
}

func New() (*Rosco, error) {
	rsc := &Rosco{
		runners: map[int]*scriptRunner{},
	}
	if err := rsc.loadConfig(); err != nil {
		return nil, fmt.Errorf("loading config: %w", err)
	}

	rsc.router = core.TopicRouter{
		BusTopic_ROSCO_REQUEST.String(): rsc.handleRequests(),
		BusTopic_ROSCO_COMMAND.String(): rsc.handleCommands(),
		"26f36f67f6931ed9":              rsc.handleDirect(),
	}

	for topic := range rsc.router {
		core.LogDebug("subscribing", "topic", topic)
		if err := core.Subscribe(topic); err != nil {
			return nil, fmt.Errorf("subscribing to topic %s: %w", topic, err)
		}
	}

	token, err := svc.TimeNotifyEvery(1)
	if err != nil {
		return nil, fmt.Errorf("requesting periodic notification: %w", err)
	}
	core.LogDebug("notification token", "token", token)

	return rsc, nil
}

func (rsc *Rosco) Handle(msg *core.BusMessage) {
	rsc.router.Handle(msg)
}

func (rsc *Rosco) handleDirect() core.TypeRouter {
	return core.TypeRouter{
		int32(svc.MessageType_TIME_NOTIFICATION_EVENT): rsc.handleTimeNotificationEvent,
		int32(svc.MessageType_WEBHOOK_CALL_EVENT):      rsc.handleWebhookCallEvent,
	}
}

func (rsc *Rosco) handleTimeNotificationEvent(msg *core.BusMessage) *core.BusMessage {
	var tn svc.TimeNotification
	if err := core.UnmarshalMessage(msg, &tn); err != nil {
		core.LogBusError("unmarshalling TimeNotification", err)
		return nil
	}
	rsc.triggerScriptSteps(tn.CurrentTimeMillis)
	return nil
}

func (rsc *Rosco) handleWebhookCallEvent(msg *core.BusMessage) *core.BusMessage {
	var wce svc.WebhookCallEvent
	if err := core.UnmarshalMessage(msg, &wce); err != nil {
		core.LogBusError("unmarshalling WebhookCallEvent", err)
		return nil
	}
	trigger, present := rsc.cfg.Triggers[wce.GetParam("trigger")]
	if !present {
		core.LogError("bad trigger", "trigger", wce.GetParam("trigger"))
		return nil
	}
	script, present := rsc.cfg.Scripts[trigger.GetScriptId()]
	if !present {
		core.LogError("bad script in trigger",
			"trigger", wce.GetParam("trigger"),
			"script_id", trigger.GetScriptId(),
		)
		return nil
	}
	rsc.runScript(trigger.GetTarget(), script.GetActions())
	return nil
}

func (rsc *Rosco) loadConfig() error {
	rsc.cfg = &Config{}
	if err := core.KVGetProto(cfgKVKey, rsc.cfg); err != nil && !errors.Is(err, akcore.ErrNotFound) {
		return fmt.Errorf("retrieving config: %w", err)
	}
	return nil
}

func (rsc *Rosco) writeCfg() {
	if err := core.KVSetProto(cfgKVKey, rsc.cfg); err != nil {
		core.LogError("writing config", "error", err.Error())
	}
}
