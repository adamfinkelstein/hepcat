#!/bin/bash

# Stop hepcat locally and at backup server
sudo supervisorctl stop hepcat
ssh ubuntu@backup.hepcat.app sudo supervisorctl stop hepcat

# Update code locally
cd /home/ubuntu/hepcat/deploy-scripts
source deploy-code-only.sh

# Copy this entire directory (including code) to backup server.
# -a flag means "archive" mode which preserves:
#    * symbolic links, important in venv, as well as
#    * permissions, timestamp, owner, group
cd /home/ubuntu
rsync -avz --delete hepcat/ ubuntu@backup.hepcat.app:hepcat/

# Start hepcat locally and at backup server
sudo supervisorctl start hepcat
ssh ubuntu@backup.hepcat.app sudo supervisorctl start hepcat
