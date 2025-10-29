# Simple Radar

A beautiful radar visualization web application that displays real-time tracking data from CSV files.

## Project Structure

```
simple-radar/
├── fe/                      # Frontend
│   ├── index.html          # Main HTML page
│   ├── style.css           # Styling
│   └── scripts/
│       ├── config.js       # Configuration constants
│       ├── radar.js        # Radar rendering logic
│       ├── network.js      # API calls and polling
│       └── main.js         # Application initialization
│
├── be/                      # Backend
│   ├── server.js           # Main server file
│   ├── config.js           # Server configuration
│   ├── data/
│   │   └── csvHandler.js   # CSV data reader and playback
│   └── routes/
│       ├── health.js       # Health check endpoint
│       └── radar.js        # Radar data endpoint
│
├── trks.csv                # Source data: tracking information
└── package.json            # Project metadata
```

## Features

- **CSV Data Integration**: Reads and plays back real tracking data from `trks.csv`
- **Beautiful Radar Display**: Circular radar with cartesian coordinate mapping
- **Real-time Playback**: Automatically advances through CSV timestamps every 500ms
- **Multi-Target Tracking**: Displays multiple tracked objects simultaneously
- **Health Monitoring**: System status HUD in top-right corner
- **Dot Tooltips**: Each radar dot displays track ID, range, and velocity
- **Track History**: Maintains position history for smooth trail effects
- **Auto-cleanup**: Clears dots when server becomes unavailable
- **Modern Design**: Dark theme with cyan and red neon accents

## How to Run

### Quick Start (Single Command)

```bash
bun run dev
# or
bun start
```

This starts both the backend (port 1337) and frontend (port 8000) servers in a single terminal with color-coded output.

Then open your browser to: **http://localhost:8000**

Press `Ctrl+C` to stop both servers.

### Alternative: Run Separately

If you prefer to run servers in separate terminals:

**Terminal 1 - Backend:**
```bash
bun run be
```

**Terminal 2 - Frontend:**
```bash
bun run fe
```

> **Note**: You cannot open `fe/index.html` directly in the browser due to CORS restrictions with ES6 modules. You must use the frontend server.

## API Endpoints

- `GET /health` - Returns server health status (random true/false)
- `GET /radar` - Returns current targets from CSV playback

### Radar Response Format

```json
{
  "targets": [
    {
      "track_id": 1,
      "timestamp": 2.7,
      "x": 2.5,
      "y": 8.1,
      "velocity": 0.7,
      "doppler": -0.7,
      "range": 9,
      "class": "Human"
    }
  ]
}
```

## CSV Data Format

The `trks.csv` file contains tracking information with the following key fields:
- **track_id**: Unique identifier for each tracked object
- **timestamp**: Time in seconds
- **x, y**: Cartesian coordinates (meters) from radar origin
- **doppler**: Doppler velocity (mapped to speed)
- **range**: Distance from radar (meters)
- **class**: Object classification (e.g., "Human")

## Configuration

### Frontend (`fe/scripts/config.js`)

- `API_BASE`: Backend server URL
- `HEALTH_CHECK_INTERVAL`: Health check polling interval (ms)
- `RADAR_CHECK_INTERVAL`: Radar data polling interval (ms)
- `SERVER_TIMEOUT`: Time before clearing dots when server is offline (ms)
- `MAX_DOTS`: Maximum number of dots to display

### Backend (`be/config.js`)

- `PORT`: Server port
- `CORS_HEADERS`: CORS configuration

## Technologies

- **Frontend**: Vanilla JavaScript (ES6 modules), HTML5 Canvas, CSS3
- **Backend**: Bun runtime
- **No build process required**
