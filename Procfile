# configuration when using Eventlet
web: gunicorn --worker-class eventlet --workers 1 hepcat:app

# configuration when not using Eventlet
# (adjust threads as necessary, leaving some headroom above the number of desired WebSocket connections)
# web: gunicorn --workers 1 --threads 120 hepcat:app
