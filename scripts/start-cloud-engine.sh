#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/../server"
npm install
docker pull "${CLOUD_DEFAULT_IMAGE:-lscr.io/linuxserver/webtop:ubuntu-xfce}"
npm run dev
