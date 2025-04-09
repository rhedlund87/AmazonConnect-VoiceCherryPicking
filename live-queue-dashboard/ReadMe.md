# Amazon Connect Live Queue Dashboard

## Overview
This application provides a dashboard interface for managing and picking contacts from a queue system integrated with Amazon Connect. 
## Features
- Real-time queue monitoring with 7-second auto-refresh
- Contact filtering by queue and agent assignment
- Contact selection and picking functionality
- Inactivity detection (2-minute timeout)

## Technical Stack
- Vanilla JavaScript
- Amazon Connect Integration (optional for cherry pick)
- REST API Integration (AWS API Gateway)
- Webpack 5 + Babel 7
- CSS/Style loaders

## Installation

### Prerequisites
- Node.js (v14+)
- npm (v6+)
- Amazon Connect access (optional for development)

### Quick Start
```bash
# Clone and install
git clone [repository-url] or download the project
cd live-queue-dashboard
npm install
npm run build

# Development
npm run start         # Access at http://localhost:9000

# Production
npm run build
npm run prepare-build
npm run create-zip
```

## Deployment

### Build & Deploy
```bash
# 1. Create production build
npm run build

# 2. Prepare and zip
npm run prepare-build
npm run create-zip

# 3. Deploy build.zip to hosting environment (AWS Amplify)
```

### Troubleshooting
```bash
# Clear build
rm -rf build/ dist/bundle.js
rm -rf node_modules/
npm install
npm run build
npm run start
```
