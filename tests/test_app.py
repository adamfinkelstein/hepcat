import os
from app import create_app


def test_create_app():
    config_name = os.getenv('FLASK_CONFIG') or 'default'
    build_path = os.getcwd() + '/build'

    app = create_app(config_name, build_path)
    assert app is not None
