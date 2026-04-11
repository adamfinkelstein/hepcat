#!/bin/bash

# Stop hepcat locally and at backup server
sudo supervisorctl stop hepcat
ssh ubuntu@backup.hepcat.app supervisorctl stop hepcat

# Update code locally
cd /home/ubuntu/hepcat
source ./deploy-scripts/deploy-code-only.sh

# Copy this entire directory (including code) to backup server
cd /home/ubuntu
rsync -rvz --delete hepcat/ ubuntu@backup.hepcat.app:hepcat/

# Start hepcat locally and at backup server
sudo supervisorctl start hepcat
ssh ubuntu@backup.hepcat.app supervisorctl start hepcat
