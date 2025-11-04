#!/bin/sh
set -e

echo "Deploying Discord slash commands..."
bun run cmd:deploy

echo "Starting bot"
exec bun run start
