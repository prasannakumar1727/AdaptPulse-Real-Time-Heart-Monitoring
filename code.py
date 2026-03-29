"""
AdaptPulse - Signal Filtering Simulation
Demonstrates adaptive noise reduction in real-time heart pulse signals.
"""

import numpy as np
import matplotlib.pyplot as plt

# ── 1. Generate synthetic clean heart signal ──────────────────────────────────
t = np.linspace(0, 1, 500)
clean_signal = np.sin(2 * np.pi * 5 * t)  # 5 Hz ~ 300 BPM (compressed demo)

# ── 2. Add noise (simulates motion artifacts from wearable devices) ───────────
np.random.seed(42)
noise = np.random.normal(0, 0.5, t.shape)
noisy_signal = clean_signal + noise

# ── 3. Apply moving-average filter (simulates FPGA low-pass filtering) ────────
window_size = 10
filtered_signal = np.convolve(
    noisy_signal, np.ones(window_size) / window_size, mode="same"
)

# ── 4. Calculate SNR improvement ─────────────────────────────────────────────
def snr(signal, reference):
    signal_power = np.mean(reference ** 2)
    noise_power = np.mean((signal - reference) ** 2)
    return 10 * np.log10(signal_power / (noise_power + 1e-10))

snr_before = snr(noisy_signal, clean_signal)
snr_after  = snr(filtered_signal, clean_signal)
print(f"SNR Before Filtering : {snr_before:.2f} dB")
print(f"SNR After Filtering  : {snr_after:.2f} dB")
print(f"Improvement          : +{snr_after - snr_before:.2f} dB")

# ── 5. Plot results ───────────────────────────────────────────────────────────
fig, axes = plt.subplots(3, 1, figsize=(12, 9), facecolor="#0d1117")
fig.suptitle(
    "AdaptPulse — Real-Time Noise Reduction Simulation",
    color="white", fontsize=16, fontweight="bold", y=0.98,
)

plot_data = [
    (clean_signal,    "#4cc9f0", "Clean Reference Signal"),
    (noisy_signal,    "#ff4d6d", "Noisy Signal (Motion Artifact)"),
    (filtered_signal, "#00d4aa", "AdaptPulse Filtered Signal"),
]

for ax, (data, color, title) in zip(axes, plot_data):
    ax.set_facecolor("#0d1117")
    ax.plot(t, data, color=color, linewidth=1.5)
    ax.set_title(title, color=color, fontsize=12, fontweight="bold", loc="left")
    ax.set_xlabel("Time (s)", color="#adb5bd")
    ax.set_ylabel("Amplitude (mV)", color="#adb5bd")
    ax.tick_params(colors="#adb5bd")
    for spine in ax.spines.values():
        spine.set_edgecolor("#333")
    ax.grid(True, color="#222", linestyle="--", linewidth=0.5)

plt.tight_layout()
plt.savefig("filtered_signal.png", dpi=150, bbox_inches="tight")
plt.show()
print("Plot saved as filtered_signal.png")
