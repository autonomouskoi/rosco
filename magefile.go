//go:build mage

package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/magefile/mage/mg"
	"github.com/magefile/mage/sh"
	"google.golang.org/protobuf/encoding/protojson"

	"github.com/autonomouskoi/akcore/modules"
	"github.com/autonomouskoi/mageutil"
)

var (
	baseDir     string
	outDir      string
	pluginDir   string
	version     string
	webSrcDir   string
	webOutDir   string
	webOutPBDir string
	nodeDir     string

	Default = Plugin
)

func init() {
	// set up our paths
	var err error
	baseDir, err = os.Getwd()
	if err != nil {
		panic(err)
	}
	outDir = filepath.Join(baseDir, "out")
	pluginDir = filepath.Join(outDir, "plugin")
	webSrcDir = filepath.Join(baseDir, "web")
	webOutDir = filepath.Join(webSrcDir, "out")
	webOutPBDir = filepath.Join(webOutDir, "pb")
	nodeDir = filepath.Join(webSrcDir, "node_modules")
}

// clean up intermediate products
func Clean() error {
	for _, dir := range []string{
		outDir, webOutDir,
	} {
		if err := sh.Rm(dir); err != nil {
			return fmt.Errorf("deleting %s: %w", dir, err)
		}
	}
	return cleanGoProtos()
}

// What's needed for running the plugin as a dev plugin
func Plugin() {
	mg.Deps(
		Icon,
		Manifest,
		WASM,
		Web,
	)
}

// Load plugin version from VERSION file
func readVersion() error {
	b, err := os.ReadFile(filepath.Join(baseDir, "VERSION"))
	if err != nil {
		return fmt.Errorf("reading VERSION: %w", err)
	}
	version = strings.TrimSpace(string(b))
	return nil
}

// Build the plugin for release
func Release() error {
	mg.Deps(Plugin, readVersion)
	filename := fmt.Sprintf("rosco-%s.akplugin", version)
	return mageutil.ZipDir(pluginDir, filepath.Join(outDir, filename))
}

func cleanGoProtos() error {
	goDir := filepath.Join(baseDir, "go")
	protoFiles, err := mageutil.DirGlob(goDir, "*.pb.go")
	if err != nil {
		return fmt.Errorf("globbing %s/*.pb.go: %w", goDir, err)
	}
	for _, protoFile := range protoFiles {
		protoFile = filepath.Join(goDir, protoFile)
		if err := sh.Rm(protoFile); err != nil {
			return fmt.Errorf("deleting %s: %w", protoFile, err)
		}
	}
	return nil
}

// Generate tinygo code for our protos
func GoProtos() error {
	protos, err := mageutil.DirGlob(baseDir, "*.proto")
	if err != nil {
		return fmt.Errorf("globbing %s: %w", baseDir)
	}

	for _, protoFile := range protos {
		srcPath := filepath.Join(baseDir, protoFile)
		dstPath := filepath.Join(baseDir, "go", strings.TrimSuffix(protoFile, ".proto")+".pb.go")
		err := mageutil.TinyGoProto(dstPath, srcPath, filepath.Join(baseDir, ".."))
		if err != nil {
			return fmt.Errorf("generating from %s: %w", srcPath, err)
		}
		/*
			if err := mageutil.ReplaceInFile(dstPath,
				`"github.com/autonomouskoi/twitch"`,
				`"github.com/autonomouskoi/twitch-tinygo"`,
			); err != nil {
				return fmt.Errorf("replacing import in %s: %w", dstPath, err)
			}
		*/
	}
	return nil
}

// Create our output dir
func mkOutDir() error {
	return mageutil.Mkdir(outDir)
}

// Create our plugin dir
func mkPluginDir() error {
	mg.Deps(mkOutDir)
	return mageutil.Mkdir(pluginDir)
}

// Compile our WASM code
func WASM() error {
	mg.Deps(mkPluginDir, GoProtos)

	goDir := filepath.Join(baseDir, "go")
	srcDir := filepath.Join(goDir, "main")
	outFile := filepath.Join(pluginDir, "plugin.wasm")

	return mageutil.TinyGoWASM(outFile, srcDir, goDir)
}

// Copy our icon
func Icon() error {
	mg.Deps(mkPluginDir)
	iconPath := filepath.Join(baseDir, "icon.svg")
	outPath := filepath.Join(pluginDir, "icon.svg")
	return mageutil.CopyFiles(map[string]string{
		iconPath: outPath,
	})
}

// Write our manifest
func Manifest() error {
	mg.Deps(mkPluginDir, readVersion)
	manifestPB := &modules.Manifest{
		Title:       "Rosco",
		Id:          "26f36f67f6931ed9",
		Name:        "rosco",
		Description: "Open Sound Control automation",
		WebPaths: []*modules.ManifestWebPath{
			{
				Path:        "/m/rosco/embed_ctrl.js",
				Type:        modules.ManifestWebPathType_MANIFEST_WEB_PATH_TYPE_EMBED_CONTROL,
				Description: "Controls for Rosco",
			},
			{
				Path:        "/m/rosco/index.html",
				Type:        modules.ManifestWebPathType_MANIFEST_WEB_PATH_TYPE_CONTROL_PAGE,
				Description: "Script Editor",
			},
		},
	}
	manifest, err := protojson.Marshal(manifestPB)
	if err != nil {
		return fmt.Errorf("marshalling proto: %w", err)
	}
	buf := &bytes.Buffer{}
	if err := json.Indent(buf, manifest, "", "  "); err != nil {
		return fmt.Errorf("formatting manifest JSON: %w", err)
	}
	fmt.Fprintln(buf)
	manifestPath := filepath.Join(pluginDir, "manifest.json")
	_, err = os.Stat(manifestPath)
	if err == nil {
		return nil
	}
	if !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return os.WriteFile(manifestPath, buf.Bytes(), 0644)
}

// install NPM modules for web content
func NPMModules() error {
	if _, err := os.Stat(nodeDir); err == nil {
		return nil
	}
	if err := os.Chdir(webSrcDir); err != nil {
		return fmt.Errorf("switching to %s: %w", webSrcDir, err)
	}
	if err := sh.Run("npm", "install"); err != nil {
		return fmt.Errorf("running npm install: %w", err)
	}
	return nil
}

// Create our web output dir
func mkWebOutDir() error {
	return mageutil.Mkdir(webOutDir)
}

func mkTSPBDir() error {
	mg.Deps(mkWebOutDir)
	return mageutil.Mkdir(webOutPBDir)
}

// Generate our TypeScript protos
func TSProtos() error {
	mg.Deps(mkTSPBDir, NPMModules)
	if err := os.Chdir(webSrcDir); err != nil {
		return fmt.Errorf("switching to %s: %w", webSrcDir, err)
	}
	err := mageutil.TSProto(
		webOutPBDir,
		filepath.Join(baseDir, "rosco.proto"),
		filepath.Join(baseDir, ".."),
		nodeDir,
	)
	if err != nil {
		return err
	}
	// output is relative to includes so we have to move the rosco files
	dumbOutPath := filepath.Join(webOutPBDir, "rosco")
	outFiles, err := os.ReadDir(dumbOutPath)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("reading %s: %w", dumbOutPath, err)
	}
	for _, outFile := range outFiles {
		outPath := filepath.Join(dumbOutPath, outFile.Name())
		/*
			if err := mageutil.ReplaceInFile(outPath, `"../twitch/eventsub_pb.js"`, `"/m/twitch/pb/eventsub_pb.js"`); err != nil {
				return fmt.Errorf("replacing proto import in %s: %w", outPath, err)
			}
			if err := mageutil.ReplaceInFile(outPath, `"../twitch/twitch_pb.js"`, `"/m/twitch/pb/twitch_pb.js"`); err != nil {
				return fmt.Errorf("replacing proto import in %s: %w", outPath, err)
			}
		*/
		if err := os.Rename(outPath, filepath.Join(webOutPBDir, outFile.Name())); err != nil {
			return fmt.Errorf("moving %d -> %d: %w", outPath, webOutPBDir, err)
		}
	}
	sh.Rm(dumbOutPath)
	return nil
}

// Compile our TS code
func TS() error {
	mg.Deps(TSProtos)
	return mageutil.BuildTypeScript(webSrcDir, webSrcDir, webOutDir)
}

// Copy static web content
func WebSrcCopy() error {
	mg.Deps(mkWebOutDir)
	filenames := []string{"index.html", "blockly.js", "script_edit.html"}
	if err := mageutil.CopyInDir(webOutDir, webSrcDir, filenames...); err != nil {
		return fmt.Errorf("copying: %w", err)
	}
	blocklyIn := filepath.Join(nodeDir, "blockly")
	if err := mageutil.CopyInDir(webOutDir, blocklyIn, "blockly_compressed.js", "blocks_compressed.js"); err != nil {
		return fmt.Errorf("copying: %w", err)
	}
	enPath := filepath.Join(blocklyIn, "msg", "en.js")
	enOutPath := filepath.Join(webOutDir, "en.js")
	if err := sh.Copy(enOutPath, enPath); err != nil {
		return fmt.Errorf("copying %s -> %s: %w", enPath, enOutPath, err)
	}
	return nil
}

// All our web targets
func Web() error {
	mg.Deps(
		WebSrcCopy,
		TS,
	)
	return mageutil.SyncDirBasic(webOutDir, filepath.Join(pluginDir, "web"))
}
