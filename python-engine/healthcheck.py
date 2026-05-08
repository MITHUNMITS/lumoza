import json

print(
    json.dumps(
        {
            "status": "ok",
            "service": "lumoza-python-sidecar",
            "mode": "phase-2-contract",
            "capabilities": [
                "heartbeat",
                "healthcheck",
                "technical-quality-contract",
            ],
        }
    )
)
