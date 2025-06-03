# Config files for installing at cloud service

Hepcat is currently hosted at [Digital Ocean](https://www.digitalocean.com/). After spinning up a host there, we need to configure it. This directory contains some configuration files that are needed.

1. `dotenv-example.txt`

   - Copy this file to the parent directory naming it ".env"
   - Uncomment and fill missing entries.

2. `nginx-config.txt`

   - Copy this file to: `/etc/nginx/sites-available/hepcat`
   - Then: `sudo service nginx reload`

3. `supervisor-hepcat.conf.txt`

   - Copy this file to: `/etc/supervisor/conf.d/hepcat.conf`
   - Then: `sudo supervisorctl reload`

4. dev server versions of (2) and (3) above.

## Local script to update

We also have a local script `clean-restart.sh` to pull updates when needed:

```
#!/bin/bash
cd /home/ubuntu/hepcat
git pull
./venv/bin/pip install -r requirements.txt
npm install
npm run build
sudo supervisorctl restart hepcat
```
