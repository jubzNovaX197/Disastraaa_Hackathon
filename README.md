# Disastraaa — Intelligent Multi-Hazard Disaster Response Platform

Disastraaa is an intelligent, multi-hazard disaster management, response, and safe transit platform built with Next.js 15, PostGIS, MapLibre GL, and real-time early warning integrations. It bridges official warning feeds (IMD CAP, SACHET), OpenStreetMap infrastructure, hydrological models, and multi-hazard risk engines into a single operational command center and public safety portal.

---

## Quick Navigation

- **Interactive Disaster Map:** [/map](http://localhost:3000/map) — Real-time spatial visualization of active alerts, cyclone paths, flood risk zones, shelters, and road passability.
- **Safe Travel & Corridor Routing:** [/travel](http://localhost:3000/travel) — Risk-aware origin-to-destination routing avoiding flooded corridors and damaged road segments.
- **Operations Command Center:** [/dashboard](http://localhost:3000/dashboard) — Situational overview, resource deployment, shelter status, and incident management.
- **Role Persona Portal & Simulation:** [/demo](http://localhost:3000/demo) — Fictional simulation portal for exploring platform capabilities across 6 operational tiers.
- **Governance & Verification:** [/governance](http://localhost:3000/governance) — National/State authority registry, personnel invitation, and audit trail.

---

## Key Capabilities

1. **Strict Data Separation (Live Operational vs. Simulation Engine)**
   - **LIVE OPERATIONAL Mode:** Connects to active feeds (IMD CAP / SACHET alerts, Open-Meteo observations, PostGIS OSM road network and registered shelters). Zero demo fixtures or synthetic water levels leak into live operations.
   - **SIMULATION Mode:** High-fidelity emergency training scenario (Puri, Odisha cyclone progression) allowing response teams and judges to evaluate risk escalation, shelter capacity exhaustion, and emergency road blockages deterministically.

2. **Multi-Hazard Risk Engine**
   - Deterministic multi-hazard risk engine combining cyclone wind speed, coastal distance, rainfall intensity, river gauge levels, and topographic elevation into standardized 0–100 risk indices.
   - Transparent calculation weights and explanations per district and transit corridor.

3. **Safe Travel & Graph-Based Routing**
   - Dynamic topological routing graph computing safest, shortest, and balanced alternative routes.
   - Automatically penalizes or prunes flooded, blocked, or high-risk road corridors with instant re-routing.

4. **Multi-Tier Role Governance & Security**
   - Cryptographically signed HMAC-SHA256 session tokens.
   - Six structured access tiers: `SUPER_ADMIN`, `NATIONAL_AUTHORITY`, `STATE_AUTHORITY`, `DISTRICT_AUTHORITY`, `FIELD_OPERATOR`, and `CITIZEN` / `REGISTERED_USER`.
   - Server-enforced permissions on critical routes (`/governance`, `/analytics`, `/api/incidents`, `/api/ingestion/sync`).

---

## Technology Stack

- **Framework:** Next.js 15 (App Router, Server Actions, Middleware)
- **Language:** TypeScript 5.6
- **Database & GIS:** PostgreSQL + PostGIS (via Neon serverless client)
- **Mapping & Geospatial:** MapLibre GL, CARTO vector basemaps, Turf.js / GeoJSON
- **Authentication:** HMAC session tokens with cookie-based verification
- **Styling & UI:** Tailwind CSS, Lucide icons, glassmorphism design system

---

## Setup & Local Development

### Prerequisites
- Node.js 20 or later
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/jubzNovaX197/Disastraaa_Hackathon.git
cd Disastraaa_Hackathon

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

### Environment Configuration (`.env.local`)
Generate a secure 32+ character authentication secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Add to `.env.local`:
```env
AUTH_SECRET=your-secure-32-char-random-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Verification & Testing

```bash
# Type checking
npm run type-check

# ESLint validation
npm run lint

# Automated unit & integration tests
npm test

# Production build validation
npm run build
```

---

## Seed Accounts for Evaluation

| Role | Email | Password | Allowed Access |
| --- | --- | --- | --- |
| `SUPER_ADMIN` | `admin@disastraaa.gov.in` | `Admin@123456` | Full platform, Governance, System Config |
| `NATIONAL_AUTHORITY` | `national@ndma.gov.in` | `National@123` | National analytics, Interstate coordination |
| `STATE_AUTHORITY` | `state@osdma.gov.in` | `State@12345` | State operations, District allocations |
| `DISTRICT_AUTHORITY` | `district@puri.nic.in` | `District@12` | Local incidents, Shelters, Dispatch |
| `FIELD_OPERATOR` | `operator@odrf.gov.in` | `Operator@12` | Field reports, Resource deployment |
| `CITIZEN` | `citizen@odisha.in` | `Citizen@123` | Public map, Travel safety, Citizen reporting |

---

## License

MIT License. External geospatial tiles, road datasets, and provider feeds retain their respective open attributions (OpenStreetMap contributors, CARTO).
