# Testing Hepcat

[This repo](https://github.com/adamfinkelstein/hepcat-chair) contains a program `fake.py` to generate fake data for testing Hepcat. Some outputs from that program, perhaps lightly edited, are also in this directory.

There are several ways to test Hepcat.

- Compile and launch the app locally, log in and try out the GUI.
- In the project root, run either:
  - `python hepcat.py tests` -- runs all unit tests in this directory.
  - `python -m pytest tests/test_sockets.py -v` -- runs specific unit tests in `test_sockets` (or more generally `test_*`).
- Whenever new code is checked into Github, these unit tests are run automatically.
- The simulation stress test described next.

## Simulation stress test with many fake users connecting on sockets:

Examples of usage:

```
python tests/fakeclients.py -w 3 -t 4 http://127.0.0.1:5000 tests/test-data/users.csv
python tests/fakeclients.py -w 3 -t 4 https://hepcat.herokuapp.com tests/test-data/users.csv
```

This runs a user simulation with three worker processes (`-w 3`), each with four client threads (`-t 4`). For this example to work, the `users.csv` file must have at least 12 users. If there aren't enough users for the requested concurrency, the script ends with an error message.

Each thread within each worker process will connect to the server running at the URL given. Some random waits are included, so that not all clients connect at the same time. Once connected, each client will wait for a random amount of time and then disconnect and reconnect, this time using the token that was returned by the user on the first connection. When the script is left running, there is going to be a constant stream of clients going away and returning a few seconds later, as if they were refreshing their browsers. If you log in as the super administrator, you can operate the server and see messages as they are pushed to clients. The clients log all received messages, but other than looking for the reconnection token they ignore all received messages.
