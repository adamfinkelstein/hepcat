This directory contains three configuration files needed when installing Hepcat.

(1) dotenv-example.txt:
    Copy this file to the parent directory naming it ".env", uncomment and fill missing entries.

(2) nginx-config.txt: 
    Copy this file to: /etc/nginx/sites-available/hepcat
    Then: sudo service nginx reload

(3) supervisor-hepcat.conf.txt
    Copy this file to: /etc/supervisor/conf.d/hepcat.conf
    Then: sudo supervisorctl reload
