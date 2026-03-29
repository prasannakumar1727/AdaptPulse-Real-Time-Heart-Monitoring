"""
AdaptPulse — Backend API (Flask)
Handles sensor data ingestion, filtering, and alert triggering.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
import time

app = Flask(__name__)
CORS(app)

# ── In-memory ring buffer ────────────────────────────────────────────────────
BUFFER_SIZE = 200
signal_buffer = []
WINDOW = 10  # Moving-average window (mirrors FPGA logic)

# ── Thresholds ────────────────────────────────────────────────────────────────
BPM_HIGH = 100
BPM_LOW  = 50

def moving_average_filter(data, window=WINDOW):
    """Simple moving-average filter — replicates FPGA low-pass stage."""
    if len(data) < window:
        return data
    kernel = np.ones(window) / window
    return np.convolve(data, kernel, mode="same").tolist()

def estimate_bpm(filtered, sample_rate=20):
    """Estimate BPM from zero-crossing rate of filtered signal."""
    crossings = sum(
        1 for i in range(1, len(filtered))
        if filtered[i - 1] < 0 <= filtered[i]
    )
    duration_s = len(filtered) / sample_rate
    return int((crossings / max(duration_s, 0.001)) * 60)

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "AdaptPulse API", "timestamp": time.time()})

@app.route("/api/data", methods=["POST"])
def receive_data():
    """Receive raw sensor readings from ESP32 / Arduino."""
    global signal_buffer
    payload = request.get_json()
    if not payload or "samples" not in payload:
        return jsonify({"error": "Missing 'samples' field"}), 400

    samples = payload["samples"]
    signal_buffer.extend(samples)
    signal_buffer = signal_buffer[-BUFFER_SIZE:]  # keep latest

    filtered = moving_average_filter(signal_buffer)
    bpm      = estimate_bpm(filtered)
    alert    = None

    if bpm > BPM_HIGH:
        alert = {"type": "TACHYCARDIA", "bpm": bpm, "message": "High heart rate detected!"}
    elif bpm < BPM_LOW and bpm > 0:
        alert = {"type": "BRADYCARDIA",  "bpm": bpm, "message": "Low heart rate detected!"}

    return jsonify({
        "status"  : "received",
        "samples" : len(samples),
        "bpm"     : bpm,
        "alert"   : alert,
    })

@app.route("/api/stream", methods=["GET"])
def stream_data():
    """Return latest raw + filtered data to dashboard."""
    filtered = moving_average_filter(signal_buffer)
    bpm      = estimate_bpm(filtered)
    return jsonify({
        "raw"      : signal_buffer[-100:],
        "filtered" : filtered[-100:],
        "bpm"      : bpm,
        "spo2"     : 98,          # placeholder — extend with real SpO₂ sensor
        "timestamp": time.time(),
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
