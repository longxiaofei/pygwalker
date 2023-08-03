#!/bin/bash
cd $(dirname "$0")/..
file_dir=$(pwd)
cur_dir=$file_dir/scripts

cd $file_dir
git clone --depth 1 --branch main git@github.com:Kanaries/gw-dsl-parser.git
cd gw-dsl-parser/wasm

go mod tidy
GOOS=js GOARCH=wasm go build -o dsl_to_sql.wasm wasm_main.go
mv dsl_to_sql.wasm $file_dir/pygwalker/templates/
cd $file_dir
rm -rf gw-dsl-parser

ret=$?
cd $cur_dir
exit $?

