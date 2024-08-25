import click
import os
import sys
from . import cli


@cli.cli.command()
@click.argument("test_names", nargs=-1)
def tests(test_names):
    """Run the tests."""
    import pytest

    os.environ["DATABASE_URL"] = "sqlite:///"  # memory
    sys.exit(
        pytest.main(
            ["--cov=app", "--cov-branch", "--cov-report=term-missing"]
            + list(test_names or ["tests"])
        )
    )
