#!/bin/bash

if [ -z "$BASH_VERSION" ]; then
    echo "Error: this script must be run with bash." >&2
    exit 1
fi

# Stop hepcat locally and at backup server
echo "About to stop hepcat at local and backup servers..."
sudo supervisorctl stop hepcat
ssh ubuntu@backup.hepcat.app sudo supervisorctl stop hepcat

# Update code locally
cd /home/ubuntu/hepcat/deploy-scripts
source deploy-code-only.sh

# Modify .env for backup server deployment
TMP_DIR="/home/ubuntu/hepcat/tmp"
ENV_FILE="/home/ubuntu/hepcat/.env"
ENV_TMP="$TMP_DIR/.env.original"

# Back up the original .env
mkdir -p $TMP_DIR
mv $ENV_FILE $ENV_TMP

# Write modified .env (with backup server flag)
cp $ENV_TMP $ENV_FILE
printf "\nDB_BACKUP_SERVER=true\n" >> $ENV_FILE

# Copy this entire directory (including code) to backup server.
# -a flag means "archive" mode which preserves:
#    * symbolic links, important in venv, as well as
#    * permissions, timestamp, owner, group
cd /home/ubuntu
rsync -avz --delete hepcat/ ubuntu@backup.hepcat.app:hepcat/

# Restore the original .env
mv $ENV_TMP $ENV_FILE

# Start hepcat locally and at backup server
sudo supervisorctl start hepcat
ssh ubuntu@backup.hepcat.app sudo supervisorctl start hepcat

echo "Done."
