#!/bin/sh
# Regenerates every OPUS mark (see build.py) in a throwaway container:
# rsvg-convert renders the vectors, Pillow packs the .ico.
set -eu
cd "$(dirname "$0")"
docker run --rm -v "$PWD:/marks" -w /marks -e OWNER="$(id -u):$(id -g)" python:3.14-alpine sh -c '
	apk add --no-cache -q rsvg-convert >/dev/null
	pip install -q --root-user-action=ignore pillow
	python build.py
'
