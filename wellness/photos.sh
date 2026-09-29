#!/usr/bin/env bash
# ERKAK · фото одной командой: сгенерировать недостающие кадры → нарезать → картинки для соцсетей → собрать сайт.
# Бесплатно через Pollinations (без ключа) или через Gemini, если задан GEMINI_API_KEY. Аргументы передаются в tools/generate.mjs.
# Пример: ./wellness/photos.sh && ./deploy.sh wellness
set -euo pipefail
cd "$(dirname "$0")"
node tools/generate.mjs "$@"
node tools/photos.mjs
node tools/og.mjs
node build.mjs
