package main

import (
	"github.com/extism/go-pdk"

	"github.com/autonomouskoi/core-tinygo"
	rosco "github.com/autonomouskoi/rosco/go"
)

var (
	r *rosco.Rosco
)

//go:export start
func Initialize() int32 {
	core.LogDebug("starting up")

	var err error
	r, err = rosco.New()
	if err != nil {
		core.LogError("creating rosco", "error", err.Error())
		core.Exit(err.Error())
		return -1
	}

	core.LogInfo("ready")

	return 0
}

//go:export recv
func Recv() int32 {
	msg := &core.BusMessage{}
	if err := msg.UnmarshalVT(pdk.Input()); err != nil {
		core.LogError("unmarshalling message", "error", err.Error())
		return 0
	}
	r.Handle(msg)
	return 0
}

func main() {}
