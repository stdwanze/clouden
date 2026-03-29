#!/usr/bin/env bash
set -e

DIST="dist"

echo "Building to $DIST/ ..."

rm -rf "$DIST"
mkdir -p "$DIST/src" "$DIST/img" "$DIST/snd"

# HTML entry point
cp index.htm "$DIST/index.htm"

# JS sources
cp src/*.js "$DIST/src/"

# Images (only runtime formats, no .xcf source files or .zip archives)
cp img/*.png "$DIST/img/"

# Sounds
cp snd/* "$DIST/snd/"

echo "Done. Output: $DIST/"
