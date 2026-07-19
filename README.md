# AI Smart Traffic Management System

A complete full-stack web application for monitoring traffic congestion, analyzing traffic density, and providing AI-powered traffic signal optimization.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, Vite, Leaflet.js, Chart.js, Axios |
| Backend | Node.js, Express.js, MongoDB, Mongoose |
| Auth | JWT, bcryptjs |
| Maps | Leaflet + OpenStreetMap |
| Charts | Chart.js via react-chartjs-2 |

## Features

- **🔐 Authentication** — Register/Login with JWT tokens and bcrypt password hashing
- **🏠 Dashboard** — Real-time overview with statistics, charts, and quick actions
- **🚦 Traffic Monitor** — Full CRUD for traffic locations with search & filter
- **🗺️ Live Map** — Interactive Leaflet map with color-coded markers
- **📊 Analytics** — Vehicle count, density, congestion, and daily trend charts
- **🤖 AI Prediction** — Rule-based AI simulation for congestion prediction
- **🚨 Emergency Module** — Toggle emergency status with clearance time estimation
- **🌙 Dark/Light Mode** — Full theme toggle

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally on port 27017

### 1. Clone / Navigate to the Project

```bash
cd traffic
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/traffic_management
JWT_SECRET=ai_traffic_super_secret_key_2024
NODE_ENV=development
```

Seed the database with sample data:
```bash
node utils/seed.js
```

Start the backend server:
```bash
npm run dev
```

Backend runs on: `http://localhost:5000`

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

### 4. Open the App

Visit **http://localhost:5173** in your browser.

**Demo credentials:**
- Email: `admin@traffic.com`
- Password: `admin123`

---

## Project Structure

```
traffic/
├── backend/
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js   # Register & login
│   │   ├── trafficController.js# Traffic CRUD
│   │   ├── predictController.js# AI prediction logic
│   │   └── dashboardController.js
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT protection
│   ├── models/
│   │   ├── User.js             # User schema
│   │   └── Traffic.js          # Traffic location schema
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── trafficRoutes.js
│   │   ├── predictRoutes.js
│   │   └── dashboardRoutes.js
│   ├── utils/
│   │   └── seed.js             # DB seeder
│   ├── server.js               # Express entry point
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── context/
    │   │   ├── AuthContext.jsx  # JWT auth state
    │   │   └── ThemeContext.jsx # Dark/Light mode
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── TrafficMonitor.jsx
    │   │   ├── MapPage.jsx
    │   │   ├── Analytics.jsx
    │   │   ├── Predict.jsx
    │   │   └── Emergency.jsx
    │   ├── components/layout/
    │   │   ├── Sidebar.jsx
    │   │   ├── Navbar.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── services/
    │   │   ├── api.js          # Axios instance + interceptors
    │   │   ├── authService.js
    │   │   └── trafficService.js
    │   ├── styles/
    │   │   └── index.css       # Global CSS variables & utilities
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    └── package.json
```

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user (protected) |

### Traffic
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/traffic` | Get all locations (filterable) |
| GET | `/api/traffic/:id` | Get single location |
| POST | `/api/traffic` | Create location |
| PUT | `/api/traffic/:id` | Update location |
| DELETE | `/api/traffic/:id` | Delete location |
| PUT | `/api/traffic/:id/emergency` | Toggle emergency |

### AI Prediction
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/predict` | Predict congestion for vehicle count |
| GET | `/api/predict/bulk` | Predict for all locations |

### Dashboard
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/dashboard` | Get dashboard statistics |

## AI Prediction Logic

| Vehicle Count | Congestion | Signal Duration | Waiting Time |
|---|---|---|---|
| < 30 | Low | 20 sec | count × 0.5 |
| 30–70 | Medium | 40 sec | count × 0.8 |
| > 70 | High | 60 sec | count × 1.2 |

## Color Coding

- 🟢 **Green** — Low traffic (< 30 vehicles)
- 🟡 **Yellow** — Medium traffic (30–70 vehicles)
- 🔴 **Red** — High traffic (> 70 vehicles)
- 🚨 **Emergency** — Emergency vehicle active

---

Made for AI Smart Traffic Management System — College Internship Project
