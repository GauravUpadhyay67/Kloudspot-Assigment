# Kloudspot Crowd Management System

A unified interface for live crowd occupancy, demographics, and entry/exit monitoring. Built with **Angular 21** and real-time updates via **Socket.IO**.

## Features

-   **Login Screen**: Secure authentication with JWT token management.
-   **Dashboard Overview**:
    -   Live Occupancy (Real-time updates via Socket.IO)
    -   Today's Footfall & Average Dwell Time
    -   Demographic Charts
-   **Real-time Alerts**: Instant notifications for zone activity.
-   **Responsive Design**: Optimized for desktop and tablets.

## Tech Stack

-   **Frontend**: Angular 21, TypeScript, Vanilla CSS
-   **Real-time**: Socket.IO Client
-   **HTTP**: Angular HttpClient / RxJS

## Setup & Run Instructions

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start the Application**:
    ```bash
    npm start
    ```
    Navigate to `http://localhost:4200/`.

## Deployment

This project is optimized for deployment on **Vercel** or **Netlify**.

### Vercel (Recommended)
1.  Push your code to a GitHub repository.
2.  Import project in Vercel.
3.  Preset: **Angular**.
4.  Build Command: `npm run build`
5.  Output Directory: `dist/kloudspot-assignment/browser`

### Netlify
1.  Import from Git.
2.  Build Command: `npm run build --prod`
3.  Publish Directory: `dist/kloudspot-assignment/browser`

## Credentials for Testing

Use the specific test account provided in the instructions:
-   **Username**: `test@test.com`
-   **Password**: `1234567890`

## API Integration

The application integrates with the following endpoints:
-   `POST /api/auth/login` - Authentication
-   `POST /api/analytics/occupancy` - Live Occupancy
-   `POST /api/analytics/footfall` - Footfall
-   `POST /api/analytics/dwell` - Dwell Time

Real-time updates are handled via `wss://hiring-dev.internal.kloudspot.com` (Alerts & Live Occupancy).

---
*Assignment Submission for Kloudspot Hiring Process*
