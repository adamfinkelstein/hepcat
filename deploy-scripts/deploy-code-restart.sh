#!/bin/bash

cd /home/ubuntu/hepcat
source ./deploy-scripts/deploy-code-only.sh
sudo supervisorctl restart hepcat
