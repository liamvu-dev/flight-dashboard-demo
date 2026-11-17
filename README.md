# Flight Dashboard Demo (Onefly Order Monitoring System)

> Real-time sci-fi flight order monitoring dashboard inspired by airport / flight operation center large-screen displays.

![Dashboard Preview](screenshot.png)

## ✈️ Features

- **3D Interactive Earth:**
  - Night earth texture with city lights and glowing blue atmosphere.
  - Smooth auto-rotation.
  - Realistic great-circle 3D flight arcs connecting international airports with color coding by world region (Asia, Europe, Americas, Middle East, Africa, Oceania).
  - **Animated 3D Airplanes:** Custom supersonic delta-wing 3D jets continuously flying along each flight arc, oriented tangentially along the curvature with smooth takeoff and landing scaling.
  - Animated airport pulse rings triggered on new live orders.

- **Real-Time Data Visualization:**
  - **5 KPI Counters:** Order Sales Amount (with continuous count-up animation), Available Routes, Covered Airports, Partner Airlines, Covered Countries/Regions.
  - **Global Route Distribution:** Multi-ring glowing donut chart (ECharts) with region percentage legend.
  - **Route Booking Records (LIVE):** Auto-scrolling real-time table displaying recent route bookings, departure times, and order timestamps.
  - **Top 10 Airlines by Orders:** Glowing gradient horizontal bar chart (ECharts) tracking booking volume per carrier.
  - **Top Routes by Region:** Ranked leaderboard with gold/silver/bronze badges and progress bars, automatically rotating through continental regions every 10 seconds.

- **Display & Responsive Design:**
  - Designed for 1920×1080 (LED wall / TV / monitor) with dynamic vector auto-scaling to fit any display aspect ratio.
  - Fullscreen toggle with the `F` key.
  - Sci-fi cyberpunk HUD aesthetics with cyan/neon accents, chamfered corner panels, and starfield background.

## 🚀 Quick Start

### Option 1: Double-click to run (Windows)
Double-click `start.bat`. It will start a local HTTP server and automatically launch the dashboard in your default browser at `http://localhost:8080`.

### Option 2: Command line
```bash
python -m http.server 8080
```
Then navigate to [http://localhost:8080](http://localhost:8080).

## 🛠️ Tech Stack

- **Three.js** & **globe.gl** – 3D earth rendering, flight curves & 3D aircraft models.
- **Apache ECharts** – Glowing donut & ranking bar charts.
- **HTML5 / CSS3 / Vanilla JS** – Lightweight, zero-build setup with Google Fonts (`Orbitron`, `Rajdhani`, `Share Tech Mono`).
