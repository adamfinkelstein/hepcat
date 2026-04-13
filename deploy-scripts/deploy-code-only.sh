#!/bin/bash

cd /home/ubuntu/hepcat
git pull
./venv/bin/pip install -r requirements.txt
npm install
npm run build
