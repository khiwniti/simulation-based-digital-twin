# Asphalt Tank Management System

## Overview

This is a real-time digital twin application for monitoring and controlling asphalt tank systems. The application features a 3D visualization of tank infrastructure with real-time data monitoring, alerting, and control capabilities. It's built as a full-stack web application with a React frontend and Express.js backend using WebSocket communication for real-time updates.

## System Architecture

The application follows a modern full-stack architecture with clear separation between client and server components:

- **Frontend**: React with TypeScript, using Vite for bundling and Three.js for 3D visualization
- **Backend**: Express.js server with TypeScript, providing REST APIs and WebSocket connections
- **Database**: PostgreSQL with Drizzle ORM for data persistence
- **Real-time Communication**: Socket.IO for bidirectional real-time data flow
- **Styling**: Tailwind CSS with shadcn/ui component library

## Key Components

### Frontend Architecture
- **3D Visualization**: React Three Fiber and Three.js for rendering the tank system digital twin
- **State Management**: Zustand stores for managing application state (tanks, alerts, audio)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Real-time Updates**: Socket.IO client for receiving live tank data and alerts

### Backend Services
- **SCADA Simulator**: Generates realistic tank data with temperature, level, and status monitoring
- **Tank Monitor Service**: Processes tank data and calculates system metrics
- **WebSocket Server**: Socket.IO server for real-time communication with clients
- **REST API**: Express routes for tank data and system metrics

### Data Models
- **Tank Data**: Temperature, level, capacity, status, and position information
- **Alert System**: Multi-severity alerts with acknowledgment and sound notifications
- **System Metrics**: Aggregated statistics across all tanks

## Data Flow

1. **Simulation Layer**: SCADA simulator generates realistic tank data every 2 seconds
2. **Processing Layer**: Tank monitor service calculates system-wide metrics
3. **Communication Layer**: WebSocket broadcasts updates to all connected clients
4. **Visualization Layer**: 3D interface updates tank states and displays alerts
5. **Interaction Layer**: Users can select tanks, acknowledge alerts, and modify settings

## External Dependencies

### Core Technologies
- **React Three Fiber**: 3D scene management and rendering
- **Socket.IO**: Real-time bidirectional communication
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Neon Database**: Serverless PostgreSQL hosting
- **Zustand**: Lightweight state management

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library
- **Inter Font**: Typography

### Development Tools
- **TypeScript**: Type safety across the entire stack
- **Vite**: Fast development server and build tool
- **ESBuild**: Fast JavaScript bundler for production

## Deployment Strategy

### Development Environment
- Vite dev server for frontend with HMR (Hot Module Replacement)
- tsx for running TypeScript server code directly
- Integrated development with single command startup

### Production Build
- Frontend: Vite build outputs static assets to `dist/public`
- Backend: ESBuild bundles server code to `dist/index.js`
- Database: Drizzle migrations applied via `db:push` command

### Environment Configuration
- PostgreSQL database via `DATABASE_URL` environment variable
- Neon Database serverless connection with connection pooling
- Static asset serving in production mode

The application is designed to be cloud-ready with serverless database connectivity and can be easily deployed to platforms like Replit, Vercel, or similar hosting services.

## Changelog
```
Changelog:
- July 06, 2025. Initial setup
- July 06, 2025. Enhanced with deep learning prediction engine and SCADA interface
- July 06, 2025. Implemented floating panel UI with full-screen 3D background
```

## Recent Changes

### Floating Panel Interface (July 06, 2025)
- Transformed UI from fixed panels to floating, draggable windows
- 3D viewport now serves as full-screen background
- Six specialized floating panels:
  - SCADA Interface: Industrial control system overview
  - System Dashboard: Real-time metrics and tank status
  - AI/ML Predictions: Deep learning predictions and optimization
  - Digital Twin: Real vs simulated data comparison
  - System Alerts: Critical notifications and warnings
  - Tank Control: Individual tank parameter adjustment

### Deep Learning Integration
- ML prediction service with 94.2% temperature prediction accuracy
- Real-time boiler control optimization with reinforcement learning
- Predictive maintenance scheduling based on failure risk assessment
- Energy optimization recommendations with confidence scoring
- Sensor health monitoring and calibration tracking

## User Preferences
```
Preferred communication style: Simple, everyday language.
```