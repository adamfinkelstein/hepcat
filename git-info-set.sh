export HEPCAT_GIT_INFO="`python git-info-get.py`"
heroku config:set HEPCAT_GIT_INFO="$HEPCAT_GIT_INFO"
