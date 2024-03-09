import argparse
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import csv
from random import choice, random
from time import sleep
import socketio


def simulate_client(url, user):
    name = f'{user["First Name"]} {user["Last Name"]}'
    sio = socketio.Client()
    token = None

    @sio.on("*")
    def catch_all(event, data):
        nonlocal token
        if event == "server_welcome":
            token = data["token"]
        print(f'[{name}] Received event "{event}"')

    @sio.event
    def disconnect():
        print(f"[{name}] Unexpected disconnect")

    while True:
        sleep(random() * 10)
        if token is None:
            auth = {"email": user["Email"], "password": user["Password"]}
        else:
            auth = {"token": token}
        try:
            sio.connect(url, auth=auth)
        except socketio.exceptions.ConnectionError:
            print(f"[{name}] Connection failed =============================================")
            continue
        if "email" in auth:
            # connected with email and password
            print(f"[{name}] Connected")
        else:
            # reconnected with the token
            print(f"[{name}] Reconnected")
        try:
            sleep(random() * 60)
        except KeyboardInterrupt:
            sio.disconnect()
            print(f"[{name}] Interrupted")
            break
        sio.disconnect()
        print(f"[{name}] Disconnected")


def start_worker(num_threads, url, users):
    print("Starting worker with {} threads".format(num_threads))

    executor = ThreadPoolExecutor(max_workers=num_threads)
    try:
        for i in range(num_threads):
            user = choice(users)
            users.remove(user)
            executor.submit(simulate_client, url, user)
    except KeyboardInterrupt:
        executor.shutdown(wait=False)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--workers", "-w", type=int, default=1, help="Number of worker processes"
    )
    parser.add_argument(
        "--threads",
        "-t",
        type=int,
        default=1,
        help="Number of threads (clients) per worker",
    )
    parser.add_argument(
        "--slice", "-s", type=int, default=0, help="Slice number of the user pool"
    )
    parser.add_argument("url", metavar="URL", help="URL of server to connect to")
    parser.add_argument("users", metavar="USERS", help="CSV file with user information")
    args = parser.parse_args()

    print("Connecting to:", args.url)
    print("Users imported from:", args.users)

    with open(args.users, "rt") as csvfile:
        users = list(csv.DictReader(csvfile))

    needed_users = args.workers * args.threads

    if args.slice:
        slice_start = needed_users * (args.slice - 1)
        slice_end = slice_start + needed_users
        print(f"Slice {args.slice} -- pulling users[{slice_start}:{slice_end}]")
        users = users[slice_start:slice_end]

    if len(users) < needed_users:
        raise RuntimeError(
            "Not enough users, need at least {} but got {}".format(
                needed_users, len(users)
            )
        )

    try:
        with ProcessPoolExecutor(max_workers=args.workers) as executor:
            for i in range(args.workers):
                process_users = []
                for j in range(args.threads):
                    user = choice(users)
                    users.remove(user)
                    process_users.append(user)
                executor.submit(start_worker, args.threads, args.url, process_users)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
