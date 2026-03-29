import { useState, useEffect, useRef } from "react";

// ── Utility: generate one "heartbeat" sample ──────────────────────────────────
function generatePulseSample(t, withNoise = false) {
  const clean = Math.sin(2 * Math.PI * 5 * t);
  return withNoise ? clean + (Math.random() - 0.5) * 0.9 : clean;
}

const HISTORY = 120;

export default function AdaptPulseDashboard() {
  const [bpm, setBpm] = useState(72);
  const [spo2, setSpo2] = useState(98);
  const [alert, setAlert] = useState(null);
  const [raw, setRaw] = useState(Array(HISTORY).fill(0));
  const [filtered, setFiltered] = useState(Array(HISTORY).fill(0));
  const [running, setRunning] = useState(true);
  const tRef = useRef(0);
  const rawBuf = useRef(Array(HISTORY).fill(0));
  const filtBuf = useRef(Array(HISTORY).fill(0));
  const WIN = 10;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      tRef.current += 0.02;
      const noisySample = generatePulseSample(tRef.current, true);
      rawBuf.current = [...rawBuf.current.slice(1), noisySample];

      // Moving-average filter (mirrors FPGA logic)
      const window = rawBuf.current.slice(-WIN);
      const filtSample = window.reduce((a, b) => a + b, 0) / window.length;
      filtBuf.current = [...filtBuf.current.slice(1), filtSample];

      setRaw([...rawBuf.current]);
      setFiltered([...filtBuf.current]);

      // Randomise vitals slightly
      if (Math.random() < 0.05) {
        const newBpm = Math.round(60 + Math.random() * 40);
        setBpm(newBpm);
        setSpo2(Math.round(95 + Math.random() * 5));
        if (newBpm > 100 || newBpm < 55) {
          setAlert(newBpm > 100 ? "⚠ Tachycardia Detected!" : "⚠ Bradycardia Detected!");
          setTimeout(() => setAlert(null), 3000);
        }
      }
    }, 50);
    return () => clearInterval(id);
  }, [running]);

  const W = 600, H = 120;
  const toY = (v, h) => h / 2 - (v * h) / 3;
  const toPath = (data, w, h) =>
    data
      .map((v, i) => `${i === 0 ? "M" : "L"} ${(i / (data.length - 1)) * w} ${toY(v, h)}`)
      .join(" ");

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh", fontFamily: "'JetBrains Mono', monospace", color: "white", padding: "2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.8rem", color: "#00d4aa", letterSpacing: "0.05em" }}>
            ❤ AdaptPulse
          </h1>
          <p style={{ margin: "0.25rem 0 0", color: "#6c757d", fontSize: "0.8rem" }}>
            Real-Time Adaptive Pulse Monitoring System
          </p>
        </div>
        <button
          onClick={() => setRunning(r => !r)}
          style={{
            padding: "0.5rem 1.2rem", borderRadius: "8px", border: "none", cursor: "pointer",
            background: running ? "#ff4d6d22" : "#00d4aa22",
            color: running ? "#ff4d6d" : "#00d4aa",
            border: `1px solid ${running ? "#ff4d6d" : "#00d4aa"}`,
            fontFamily: "inherit", fontSize: "0.85rem",
          }}
        >
          {running ? "⏸ Pause" : "▶ Resume"}
        </button>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div style={{
          background: "#ff4d6d22", border: "1px solid #ff4d6d", borderRadius: "10px",
          padding: "0.75rem 1.5rem", marginBottom: "1.5rem", color: "#ff4d6d",
          fontSize: "1rem", fontWeight: "bold", animation: "pulse 1s infinite",
        }}>
          {alert}
        </div>
      )}

      {/* Vitals Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Heart Rate", value: `${bpm}`, unit: "BPM", color: "#ff4d6d", icon: "♥" },
          { label: "SpO₂", value: `${spo2}`, unit: "%", color: "#4cc9f0", icon: "◎" },
          { label: "Status", value: bpm > 100 || bpm < 55 ? "ALERT" : "NORMAL", unit: "", color: bpm > 100 || bpm < 55 ? "#ff4d6d" : "#00d4aa", icon: "●" },
        ].map(({ label, value, unit, color, icon }) => (
          <div key={label} style={{
            background: "#161b22", border: `1px solid ${color}44`, borderRadius: "12px",
            padding: "1.25rem", textAlign: "center",
          }}>
            <div style={{ fontSize: "1.5rem", color }}>{icon}</div>
            <div style={{ fontSize: "2.2rem", fontWeight: "bold", color, margin: "0.25rem 0" }}>
              {value}<span style={{ fontSize: "1rem", marginLeft: "4px" }}>{unit}</span>
            </div>
            <div style={{ color: "#6c757d", fontSize: "0.75rem" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Graphs */}
      {[
        { title: "Raw Signal (Motion Noise)", data: raw, color: "#ff4d6d" },
        { title: "Filtered Signal (AdaptPulse)", data: filtered, color: "#00d4aa" },
      ].map(({ title, data, color }) => (
        <div key={title} style={{
          background: "#161b22", border: `1px solid ${color}44`, borderRadius: "12px",
          padding: "1rem", marginBottom: "1rem",
        }}>
          <p style={{ margin: "0 0 0.5rem", color, fontSize: "0.8rem", fontWeight: "bold" }}>{title}</p>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
            <path d={toPath(data, W, H)} fill="none" stroke={color} strokeWidth="1.5" />
          </svg>
        </div>
      ))}

      <p style={{ textAlign: "center", color: "#6c757d", fontSize: "0.7rem", marginTop: "1rem" }}>
        AdaptPulse — Hackathon Prototype | Adaptive Filtering via FPGA Logic
      </p>
    </div>
  );
}
