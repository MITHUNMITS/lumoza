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
def capabilities_payload():
    return {
        "service": "lumoza-python-sidecar",
        "mode": "phase-3-contract",
        "capabilities": [
            "heartbeat",
            "healthcheck",
            "technical-quality-contract",
            "duplicate-burst-contract",
            "selection-ranking-contract",
            "confidence-ranking-contract",
            "face-detection-contract",
            "people-clustering-contract",
            "people-priority-contract",
        ],
    }
signal.signal(signal.SIGINT, handle_signal)
signal.signal(signal.SIGTERM, handle_signal)
if len(sys.argv) > 1 and sys.argv[1] == "capabilities":
    print(json.dumps(capabilities_payload()), flush=True)
    sys.exit(0)
print(json.dumps({"event": "startup", **capabilities_payload()}), flush=True)
while running:
    time.sleep(5)
    print(json.dumps({"event": "heartbeat", "status": "placeholder", "mode": "phase-3-contract"}), flush=True)
Path("sidecar.exit").write_text("stopped\n")
sys.exit(0)
