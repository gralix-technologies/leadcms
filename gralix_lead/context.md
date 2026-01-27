# Gralix Lead Management System — Codebase Context

## What this application is
This repo is a **Django + React (Vite)** hybrid web application for tracking **sales leads** across three business divisions:

- **Gralix Tech** (`tech`)
- **Gralix Actuarial** (`actuarial`)
- **Gralix Capital** (`capital`)

The backend is **Django REST Framework** (DRF) serving a **React Single Page Application (SPA)**. Users log in via Django sessions.

Key features:
- **Lead Management**: Kanban and List views, filtering by Status/Division, Probability tracking (0-100%).
- **Dashboard**: Real-time metrics, Division/Team performance widgets, Interactive drill-down cards.
- **Notifications**: In-app alerts for assignments, new activities, and follow-up deadlines.
- **Resource Planning**: Assign personnel (labor) and materials to 'Won' leads with **cost tracking in ZMW (Kwacha)**.
- **Analytics**: Real-time dashboard with division-specific breakouts (Overview, Tech, Actuarial, Capital).
- **Interactive UI**: Drag-and-drop Kanban, modal-based editing, responsive charts (Recharts).
- **Currency**: Global usage of ZMW (Zambian Kwacha).

---

## Project layout (high level)
- `manage.py`: Django management entrypoint
- `frontend/`: **React Application (Vite)**
  - `src/`: React source code
    - `components/`: Reusable UI components
      - `common/`: `NotificationBell`, `LeadDetailModal`, etc.
      - `dashboard/`: `StatusCard`, `LeadListModal`
    - `layouts/`: `DashboardLayout` (Sidebar + Header)
    - `pages/`: Route components (`Dashboard`, `Leads`, `Calendar`, `Analytics`)
    - `services/`: API integration (`api.js`, `leadService`, `notificationService`)
  - `public/`: Static assets
  - `vite.config.js`: Vite configuration (proxy to Django :8000)
- `lead/`: Django project module (settings, root urls, ASGI/WSGI)
- `gralix_lead/`: main Django app
  - `models.py`: `Personnel`, `Lead`, `Product`, `Communication`, `Assignment`, `Notification`
  - `views.py`: API views + standard login views
  - `serializers.py`: DRF serializers
  - `signals.py`: Logic for Score updates and Notifications
  - `urls.py`: routes for `/api/*`
- `db.sqlite3`: local SQLite DB (dev)

---

## Data model (entities and relationships)

### `Personnel` (custom user model)
Extends `AbstractUser`.
- `division`: `tech`, `actuarial`, `capital`
- `role`: `admin`, `manager`, `agent`
- `workload_cached`: integer counter (legacy)
- `daily_rate`: Decimal (ZMW)

### `Lead`
Core business object.
- `status`: `new`...`won`|`lost`
- `probability_of_completion`: integer 0..100 (Immutable after creation)
- `quality_score`: 0-100 (Calculated via logic)
- `division`: Required
- `assigned_to`: FK to Personnel
- `follow_up_date`: DateField (Used for calendar/notifications)

### `Notification` (New)
System alerts for users.
- `user`: FK to Personnel (Recipient)
- `message`: Text content
- `lead`: FK to Lead (Optional context)
- `notification_type`: `followup` | `activity` | `assignment` | `system`
- `is_read`: Boolean
- `meta_data`: JSONField (Deep linking IDs)

### `Communication` & `Assignment`
- Audit trail for interactions and ownership changes.
- **Signals**: Creating these triggers Notifications.

---

## HTTP routes

### JSON API (Authenticated)
- `GET /api/leads/`: List leads (scoped to user access)
- `POST /api/leads/create/`: Create lead
- `GET /api/analytics/`: Dashboard metrics (Pipeline, Conversion, Division/Team Performance)
- `GET /api/notifications/`: Get unread notifications + dynamic follow-up checks
- `POST /api/notifications/<id>/read/`: Mark as read
- `POST /api/bulk-assign/`: Bulk lead assignment
- `POST /api/reassign/`: Individual reassignment

---

## Frontend Structure
- **Vite + React** setup.
- **Styling**: Tailwind CSS + Lucide Icons.
- **Theme**: **Orange (#E85C2C)** is the Primary Brand Color. Blue is Secondary.
- **State Management**: Local state + React Router.
- **Layout**: `DashboardLayout` contains the `Sidebar` and a **Header** with:
    - `NotificationBell`: Real-time alerts.
    - `UserProfile`: Avatar, Name, and Logout.
- **Dashboard**:
    - **Quick Overview**: Interactive cards filtering leads by status.
    - **Performance Widgets**: Division Revenue and Team Leaderboards.

---

## Development
1. **Backend**: `python manage.py runserver` (http://localhost:8000)
2. **Frontend**: `npm run dev` (http://localhost:5173)
3. **Login**: Access via Frontend. React Proxy forwards `/api` requests to Backend.
