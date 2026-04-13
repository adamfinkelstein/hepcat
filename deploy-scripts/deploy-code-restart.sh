#!/bin/bash

if [ -z "$BASH_VERSION" ]; then
    echo "Error: this script must be run with bash." >&2
    exit 1
fi

cd /home/ubuntu/hepcat/deploy-scripts
source deploy-code-only.sh
sudo supervisorctl restart hepcat

echo "Done."
