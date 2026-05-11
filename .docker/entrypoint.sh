#!/bin/sh

if command -v yarn >/dev/null 2>&1; then
  yarn db:deploy
else
  npm run db:deploy
fi

exec dumb-init node dist/src/main.js