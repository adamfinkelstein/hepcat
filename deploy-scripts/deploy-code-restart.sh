#!/bin/bash

cd /home/ubuntu/hepcat/deploy-scripts
source deploy-code-only.sh
sudo supervisorctl restart hepcat
