#!/usr/bin/env bash
# Copies the film's source files and the backend from the working project back into the tracked folders.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf scramble && mkdir -p scramble/docs
cp -r project/config scramble/config && cp -r project/prompts scramble/prompts
cp project/docs/PLAN.md scramble/docs/PLAN.md && cp project/story.md scramble/story.md
rm -f scramble/config/approval.json scramble/config/production.json scramble/config/project.json
cp project/tools/python/free_backend.py project/tools/python/kaggle_kernel.py backend/tools/python/
cp project/lib/free/*.rb backend/lib/free/
