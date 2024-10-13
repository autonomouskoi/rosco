//go:build mage

package main

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/magefile/mage/mg"
	"github.com/magefile/mage/sh"

	"github.com/autonomouskoi/mageutil"
)

var (
	baseDir string
	webDir  string
)

var Default = All

func init() {
	var err error
	baseDir, err = os.Getwd()
	if err != nil {
		panic(err)
	}
	baseDir = filepath.Join(baseDir, "..")
	webDir = filepath.Join(baseDir, "web")
}

func Clean() error {
	for _, dir := range []string{
		webDir,
		webDir + ".zip",
	} {
		if err := sh.Rm(dir); err != nil {
			return fmt.Errorf("removing %s: %w", dir, err)
		}
	}
	return nil
}

func All() {
	mg.Deps(
		Dev,
		WebZip,
	)
}

func Dev() {
	mg.Deps(
		GoProtos,
		WebSrc,
	)
}

func GoProtos() error {
	return mageutil.GoProtosInDir(baseDir, "module=github.com/autonomouskoi/rosco")
}

func TSProtos() error {
	mg.Deps(WebDir)
	return mageutil.TSProtosInDir(webDir, baseDir)
}

func TS() error {
	mg.Deps(WebDir)
	mg.Deps(TSProtos)
	return mageutil.BuildTypeScript(baseDir, baseDir, webDir)
}

func WebDir() error {
	return mageutil.Mkdir(webDir)
}

func WebSrcCopy() error {
	mg.Deps(WebDir)
	filenames := []string{"index.html"}
	if err := mageutil.CopyInDir(webDir, baseDir, filenames...); err != nil {
		return fmt.Errorf("copying: %w", err)
	}
	return nil
}

func WebSrc() {
	mg.Deps(
		WebSrcCopy,
		TS,
	)
}

func WebZip() error {
	mg.Deps(WebSrc)

	zipPath := filepath.Join(baseDir, "web.zip")
	if err := sh.Rm(zipPath); err != nil {
		return fmt.Errorf("removing %s: %w", zipPath, err)
	}

	return mageutil.ZipDir(webDir, zipPath)
}
