# Schedule PS-Consultation

A Progressive Web App (PWA) for patients to schedule clinic consultation visits. Built with **React + Vite + TailwindCSS** frontend and **Python FastAPI** backend.

---

## Features

### Patient Booking
- Select available date (only clinic days shown)
- Choose visit type: **Wound Care (30 min)** or **Non-Wound Care (20 min)**
- Pick from auto-generated, non-overlapping time slots
- Enter patient details: name, age, gender, visit category, reason
- Receive booking confirmation with reference number

### Admin Dashboard (Password Protected)
- View all scheduled appointments
- Filter appointments by date
- Export daily schedule as **PDF**
- Delete appointments
- Configure clinic settings

### Clinic Time Logic
| Session   | Time              | Notes       |
|-----------|-------------------|-------------|
| Morning   | 9:00 AM – 1:00 PM | Active      |
| Break     | 1:00 – 1:30 PM    | No bookings |
| Afternoon | 1:30 PM – 5:00 PM | Active      |

### PWA Features
- Installable on phone/desktop
- Offline fallback page
- Fast loading, app-like interface

---

## Tech Stack

| Layer    | Technology                    |
|----------|-------------------------------|
| Frontend | React 18, Vite, TailwindCSS   |
| Backend  | Python, FastAPI               |
| Database | SQLite (default) / PostgreSQL |
| Auth     | JWT + bcrypt                  |
| PDF      | ReportLab                     |

---

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── database.py          # Database connection & session
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── auth.py              # JWT authentication & password hashing
│   ├── pdf_generator.py     # PDF schedule generation
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Environment variables
│   └── routes/
│       ├── slots.py         # Available time slot generation
│       ├── appointments.py  # Booking appointments
│       ├── admin.py         # Admin login, view, delete, export
│       └── settings.py      # Clinic configuration
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js       # Vite config with API proxy
│   ├── tailwind.config.js
│   ├── public/
│   │   ├── manifest.json    # PWA manifest
│   │   ├── sw.js            # Service worker
│   │   ├── offline.html     # Offline fallback
│   │   └── favicon.svg
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── utils/api.js     # API client
│       ├── components/
│       │   └── Header.jsx
│       └── pages/
│           ├── Home.jsx
│           ├── BookAppointment.jsx
│           ├── Confirmation.jsx
│           ├── AdminLogin.jsx
│           ├── AdminDashboard.jsx
│           └── AdminSettings.jsx
└── README.md
```

---

## Setup & Installation

### Prerequisites
- **Python 3.9+**
- **Node.js 18+**

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Edit .env file (update SECRET_KEY for production)
# DATABASE_URL=sqlite:///./ps_consultation.db
# SECRET_KEY=your-random-secret-key

# Start the server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API calls to `http://localhost:8000`.

### 3. First-Time Admin Setup

1. Open `http://localhost:5173/admin`
2. You'll be prompted to **create an admin password** (first time only)
3. After setup, log in with your password
4. Go to **Settings** to configure clinic days and hours

---

## API Endpoints

### Public
| Method | Endpoint             | Description              |
|--------|----------------------|--------------------------|
| GET    | `/api/slots`         | Get available time slots |
| POST   | `/api/appointments`  | Book an appointment      |
| GET    | `/api/health`        | Health check             |

### Admin (JWT Required)
| Method | Endpoint                          | Description           |
|--------|-----------------------------------|-----------------------|
| POST   | `/api/admin/login`                | Admin login           |
| GET    | `/api/admin/appointments`         | List appointments     |
| DELETE | `/api/admin/appointments/:id`     | Delete appointment    |
| GET    | `/api/admin/export-pdf?date=`     | Export PDF schedule   |
| GET    | `/api/admin/settings`             | Get clinic settings   |
| PUT    | `/api/admin/settings`             | Update settings       |
| GET    | `/api/admin/settings/status`      | Check setup status    |
| POST   | `/api/admin/settings/setup`       | Initial admin setup   |

---

## Production Deployment

### Build Frontend
```bash
cd frontend
npm run build
```

### Serve with FastAPI
Configure FastAPI to serve the `frontend/dist` folder as static files for production.

### Use PostgreSQL
Update `backend/.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/ps_consultation
```

Install the PostgreSQL driver:
```bash
pip install psycopg2-binary
```

### Security Checklist
- [ ] Change `SECRET_KEY` in `.env` to a strong random value
- [ ] Use HTTPS in production
- [ ] Set strong admin password
- [ ] Restrict CORS origins in `main.py`
