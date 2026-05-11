#!/bin/bash

yarn config set cache-folder /usr/src/app/.docker/.yarn-cache --global
yarn config set network-timeout 300000
yarn
yarn prisma:migrate:init
yarn dev:docker