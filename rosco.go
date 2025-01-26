package rosco

import (
	"context"
	_ "embed"
	"errors"
	"fmt"
	"math/rand"
	"net/http"
	"sync"

	"github.com/hypebeast/go-osc/osc"
	"golang.org/x/sync/errgroup"

	"github.com/autonomouskoi/akcore"
	"github.com/autonomouskoi/akcore/bus"
	"github.com/autonomouskoi/akcore/modules"
	"github.com/autonomouskoi/akcore/modules/modutil"
	"github.com/autonomouskoi/akcore/storage/kv"
	"github.com/autonomouskoi/akcore/web/webutil"
)

const (
	EnvLocalContentPath = "AK_CONTENT_ROSCO"
)

var (
	cfgKVKey = []byte("config")
)

func init() {
	manifest := &modules.Manifest{
		Id:          "26f36f67f6931ed9",
		Name:        "rosco",
		Description: "Open Sound Control integration",
		WebPaths: []*modules.ManifestWebPath{
			{
				Path:        "https://autonomouskoi.org/module-rosco.html",
				Type:        modules.ManifestWebPathType_MANIFEST_WEB_PATH_TYPE_HELP,
				Description: "Help!",
			},
			{
				Path:        "/m/rosco",
				Type:        modules.ManifestWebPathType_MANIFEST_WEB_PATH_TYPE_CONTROL_PAGE,
				Description: "Controls for Rosco",
			},
		},
	}
	modules.Register(manifest, &Rosco{})
}

//go:embed web.zip
var webZip []byte

type Rosco struct {
	http.Handler
	bus *bus.Bus
	modutil.ModuleBase
	lock    sync.Mutex
	kv      kv.KVPrefix
	cfg     *Config
	clients map[int32]*osc.Client
}

func (rsc *Rosco) Start(ctx context.Context, deps *modutil.ModuleDeps) error {
	rsc.bus = deps.Bus
	rsc.Log = deps.Log
	rsc.kv = deps.KV
	rsc.clients = map[int32]*osc.Client{}

	if err := rsc.loadConfig(); err != nil {
		return fmt.Errorf("loading config: %w", err)
	}
	defer rsc.writeCfg()

	for id, host := range rsc.cfg.Targets {
		rsc.clients[id] = osc.NewClient(host.Address, int(host.Port))
	}
	defer func() { rsc.clients = nil }()

	fs, err := webutil.ZipOrEnvPath(EnvLocalContentPath, webZip)
	if err != nil {
		return fmt.Errorf("get web FS %w", err)
	}
	rsc.Handler = http.FileServer(fs)

	eg := errgroup.Group{}
	eg.Go(func() error { return rsc.handleRequests(ctx) })
	eg.Go(func() error { return rsc.handleCommands(ctx) })

	return eg.Wait()
}

func (rsc *Rosco) handleRequests(ctx context.Context) error {
	rsc.bus.HandleTypes(ctx, BusTopic_ROSCO_REQUEST.String(), 8,
		map[int32]bus.MessageHandler{
			int32(MessageTypeRequest_CONFIG_GET_REQ):   rsc.handleRequestConfigGet,
			int32(MessageTypeRequest_MESSAGE_SEND_REQ): rsc.handleRequestSendMessage,
			int32(MessageTypeRequest_SCRIPT_RUN_REQ):   rsc.handleRequestRunScript,
		},
		nil,
	)
	return nil
}

func (rsc *Rosco) handleRequestConfigGet(msg *bus.BusMessage) *bus.BusMessage {
	reply := &bus.BusMessage{
		Topic: msg.GetTopic(),
		Type:  msg.Type + 1,
	}
	rsc.lock.Lock()
	rsc.MarshalMessage(reply, &ConfigGetResponse{
		Config: rsc.cfg,
	})
	rsc.lock.Unlock()
	return reply
}

func (rsc *Rosco) handleRequestSendMessage(msg *bus.BusMessage) *bus.BusMessage {
	reply := &bus.BusMessage{
		Topic: msg.GetTopic(),
		Type:  msg.Type + 1,
	}
	smr := &SendMessageRequest{}
	if reply.Error = rsc.UnmarshalMessage(msg, smr); reply.Error != nil {
		return reply
	}
	if reply.Error = rsc.sendMessage(smr.Target, smr); reply.Error != nil {
		return reply
	}
	rsc.MarshalMessage(reply, &SendMessageResponse{})
	return reply
}

func (rsc *Rosco) handleCommands(ctx context.Context) error {
	rsc.bus.HandleTypes(ctx, BusTopic_ROSCO_COMMAND.String(), 4,
		map[int32]bus.MessageHandler{
			int32(MessageTypeCommand_CONFIG_SET_REQ): rsc.handleCommandConfigSet,
		},
		nil,
	)
	return nil
}

func (rsc *Rosco) handleCommandConfigSet(msg *bus.BusMessage) *bus.BusMessage {
	reply := &bus.BusMessage{
		Topic: msg.GetTopic(),
		Type:  msg.Type + 1,
	}
	csr := &ConfigSetRequest{}
	if reply.Error = rsc.UnmarshalMessage(msg, csr); reply.Error != nil {
		return reply
	}
	targets := make(map[int32]*Target, len(csr.Config.Targets))
	for id, target := range csr.Config.Targets {
		if id == 0 {
			id = rand.Int31()
		}
		targets[id] = target
	}
	csr.Config.Targets = targets
	rsc.lock.Lock()
	rsc.cfg = csr.GetConfig()
	rsc.lock.Unlock()
	rsc.writeCfg()
	rsc.MarshalMessage(reply, &ConfigSetResponse{
		Config: rsc.cfg,
	})
	return reply
}

func (rsc *Rosco) loadConfig() error {
	rsc.cfg = &Config{}
	if err := rsc.kv.GetProto(cfgKVKey, rsc.cfg); err != nil && !errors.Is(err, akcore.ErrNotFound) {
		return fmt.Errorf("retrieving config: %w", err)
	}
	return nil
}

func (rsc *Rosco) writeCfg() {
	rsc.lock.Lock()
	defer rsc.lock.Unlock()
	if err := rsc.kv.SetProto(cfgKVKey, rsc.cfg); err != nil {
		rsc.Log.Error("writing config", "error", err.Error())
	}
}
