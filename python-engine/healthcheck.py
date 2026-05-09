import json

print(
    json.dumps(
        {
            "status": "ok",
            "service": "lumoza-python-sidecar",
            "mode": "phase-3-local-ready",
            "capabilities": [
                "heartbeat",
                "healthcheck",
                "technical-quality-contract",
                "duplicate-burst-contract",
                "selection-ranking-contract",
                "confidence-ranking-contract",
                "face-detection-local-cpu",
                "people-clustering-local-cpu",
                "people-priority-controls",
            ],
        }
    )
)
