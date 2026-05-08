import json
import signal
import sys
import time
from pathlib import Path

running = True


def handle_signal(signum, _frame):
    global running
    running = False
    print(json.dumps({"event": "shutdown", "signal": signum}), flush=True)


signal.signal(signal.SIGINT, handle_signal)
signal.signal(signal.SIGTERM, handle_signal)

print(json.dumps({"event": "startup", "service": "lumoza-python-sidecar", "mode": "placeholder"}), flush=True)

while running:
    time.sleep(5)
    print(json.dumps({"event": "heartbeat", "status": "placeholder"}), flush=True)

Path("sidecar.exit").write_text("stopped\n")
sys.exit(0)
