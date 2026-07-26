# Productivity Tool for Field Employees

**Candidate Code:** SA-RN-7032

A robust, offline-first React Native mobile application built with Expo (SDK 54) for field technical specialists to manage daily tasks, track execution statuses, and view an audit trail of actions with automated remote synchronization.

---

## 🚀 Tech Stack & Libraries

- **Framework:** Expo (Managed Workflow, SDK 54) — Chosen for rapid cross-platform deployment and reliable build tooling.
- **Language:** TypeScript — Ensures type safety across data contracts and domain logic.
- **Navigation:** Expo Router (File-based navigation) — Implements scalable app architecture.
- **State Management:** React Context (TaskContext, ThemeContext) — Lightweight, robust global state perfect for this application scale.
- **Local Persistence:** AsyncStorage — Embedded client-side key-value storage for seamless offline access.
- **Network Detection:** `@react-native-community/netinfo` — Provides reactive network state observation.
- **Geocoding & Maps:** `expo-location` & `react-native-maps` — Power native map interaction and two-way address-to-coordinate conversion.
- **Attachments:** `expo-image-picker` & `expo-document-picker` — Handle multi-format attachment buffering.
- **Notifications:** `expo-notifications` — Manages local notification scheduling and time-triggering.

---

## 🏗 Project Architecture & File Structure

The project is organized following Clean Architecture principles, ensuring strict separation of concerns between routing and domain logic:

```text
task-manager-app/
├── app/                        # Routing & Screen Navigation Layer (Expo Router)
│   ├── (tabs)/                 # Bottom Tab Layout & Navigation Flow
│   │   ├── _layout.tsx         # Configures tab icons, colors, and global tab headers
│   │   ├── index.tsx           # Main Task List screen (Sorting, filtering, candidate code)
│   │   ├── create.tsx          # Task Creation form (Fields, attachments, map picker)
│   │   └── history.tsx         # History Log screen (Real-time user audit trail)
│   ├── _layout.tsx             # Root layout component (Stack navigation & Global context providers)
│   └── modal.tsx               # Task Detailed View screen (Rendered as an interactive modal)
├── src/                        # Core Domain Logic Layer (Isolated from routing)
│   ├── context/                # Global state wrappers
│   │   ├── TaskContext.tsx     # State machine for tasks, history records, and synchronization
│   │   └── ThemeContext.tsx    # Context managing light/dark visual theme state toggling
│   ├── services/               # Pure infrastructure services (Isolated API and device hardware calls)
│   │   ├── NotificationService.ts # Encapsulates runtime permission requests and local push routines
│   │   └── SyncService.ts         # Handles remote HTTP fetch actions (POST, PUT, DELETE)
│   └── types/                  # Centralized TypeScript definition directory
│       └── index.ts            # Structures schemas for Task, HistoryLog, and TaskStatus types
├── app.json                    # Native app manifest configuration (EAS Build permissions metadata)
├── db.json                     # Clean storage mock for local json-server back-end testing
├── eas.json                    # Automation script configuration for compiling stand-alone APKs
└── README.md                   # Comprehensive technical documentation
```

---

## 🔄 Offline-First & Sync Architecture

The app relies on an **Optimistic UI / Offline-First** paradigm designed for unstable field environments:

1. **Immediate Execution:** Any user intent (Create, Status Update, Delete) modifies the local storage state (`AsyncStorage`) and changes the interface state within milliseconds. The field specialist never stares at network spinners.
2. **Audit Logging:** Every user transaction creates an immutable event in the internal `HistoryLog` with a unique ID and ISO timestamp.
3. **Concurrency Control:** The background processing worker utilizes a concurrency flag lock (`isSyncing`) to eliminate race conditions, preventing duplicated payloads if the network toggles abruptly.
4. **Data Sync Engine:** When `NetInfo` reports network restoration, the synchronization layer runs sequentially:
   - **History Flush:** Evaluates remote logs via a quick `GET /history` call and pushes missing audit items one-by-one using `POST` requests.

---

## 🛠 Setup & Run Instructions

### 1. Launch the Mock REST Server

A pre-configured JSON database template is included at the root level (`db.json`). Launch the backend mapper tool to listen for external requests from physical mobile devices:

```bash
npx json-server --watch db.json --port 3000 --host 0.0.0.0
```

_Note: The `--host 0.0.0.0` directive is essential to bridge incoming packets from the phone over your local network loop._

### 2. Configure Environment Connection

Open `src/services/SyncService.ts` and set the `API_URL` matching your machine's unique wireless adapter IPv4 string (e.g., `http://192.168.X.X:3000`). Alternatively, map a standard proxy wrapper using `ngrok` if your security router enforces access insulation rules.

### 3. Run the Expo Client Application

Download standard repository modules and spin up Metro bundler pipeline scripts:

```bash
npm install --legacy-peer-deps
npx expo start -c
```

Scan the produced terminal QR matrix with your phone running the standard **Expo Go** application sandbox.

---

## ⚠️ Known Limitations & Trade-Offs

- **Remote Push Notice Exclusions:** Per official changes introduced in the Expo SDK 54 core framework, remote cloud notification mechanics (FCM/APNS cloud routing modules) are restricted within the basic Expo Go client runtime environment. In strict accordance with task requirements, this build successfully relies entirely on internal **Local Push Notification** timers.

---

## 🤖 AI & Automated Tooling Disclosure

In accordance with modern engineering workflows, an AI coding copilot was utilized throughout the repository production lifecycle. Specifically, AI structural generators helped bootstrap baseline structural TypeScript configurations, speed up repetitive layout properties (React Native StyleSheet wrappers), optimize sequential loop patterns for error boundaries, and untangle environment package conflicts within the Expo SDK 54 framework. Core data orchestration layouts, soft-deletion queuing models, and atomic context state machines were intentionally structured manually to fulfill code stability guidelines.

---

_Developed under unique evaluation credentials: **SA-RN-7032**._
