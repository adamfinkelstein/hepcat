from . import cli


@cli.cli.command()
def tests():
    """Run the tests."""
    import pytest

    pytest.main(['--cov=app', '--cov-branch', '--cov-report=term-missing', 'tests'])
