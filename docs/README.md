<!-- DOCUMENTATION FILE - DO NOT READ FOR CONTEXT -->

# Documentation

This folder contains detailed documentation for developers. These files are for reference only.

---

# Docify

A modern full-stack Node.js application with Express MVC backend and enterprise React frontend.

## Features

✅ **Backend (Express.js + MVC Architecture)**
- RESTful API with versioning (`/api/v1`)
- MVC structure (Models, Controllers, Services, Routes)
- File upload support (images & PDFs) using Multer
- Centralized error handling
- Request logging with Morgan
- CORS & security headers (Helmet)
- Environment-based configuration

✅ **Frontend (React + Vite)**
- Enterprise folder structure (features, components, hooks, services, store)
- Path aliases for clean imports (`@components`, `@services`, etc.)
- Reusable components (Button, FileUpload)
- CSS Modules for scoped styling
- API proxy configuration
- Custom hooks for data fetching

## Project Structure

```
docify/
├── backend/          # Express MVC API
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API routes (versioned)
│   │   ├── models/         # Data models
│   │   ├── middleware/     # Custom middleware
│   │   ├── utils/          # Helper functions
│   │   └── config/         # Configuration
│   └── uploads/      # Uploaded files (gitignored)
│
└── frontend/         # React SPA
    └── src/
        ├── components/     # UI components
        ├── pages/          # Page components
        ├── hooks/          # Custom React hooks
        ├── services/       # API calls
        ├── store/          # State management
        ├── utils/          # Utility functions
        └── assets/         # Static assets
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd docify
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Set up environment variables**
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### Development

**Run both frontend and backend concurrently:**
```bash
npm run dev
```

**Or run them separately:**
```bash
# Backend (runs on http://localhost:5000)
npm run dev:backend

# Frontend (runs on http://localhost:5173)
npm run dev:frontend
```

## Document Upload Feature

### Backend API Endpoints

**Upload Document**
- **POST** `/api/v1/documents/upload`
- **Content-Type:** `multipart/form-data`
- **Field:** `document` (single file)
- **Allowed types:** JPEG, PNG, GIF, WEBP, PDF
- **Max size:** 10MB

**Get All Documents**
- **GET** `/api/v1/documents`

**Get Document by ID**
- **GET** `/api/v1/documents/:id`

**Delete Document**
- **DELETE** `/api/v1/documents/:id`

**View Uploaded Files**
- **GET** `/uploads/:filename`

### Frontend Usage

Navigate to **http://localhost:5173/documents** to:
- Upload images or PDF documents
- View all uploaded documents
- Delete documents
- Preview uploaded files

## Technology Stack

### Backend
- Express.js
- Multer (file uploads)
- Helmet (security)
- CORS
- Morgan (logging)
- dotenv

### Frontend
- React 18
- Vite
- React Router
- Axios
- CSS Modules

## Scripts

### Root
- `npm run dev` - Run both backend and frontend
- `npm run install:all` - Install all dependencies

### Backend
- `npm run dev` - Start with nodemon
- `npm start` - Start production server

### Frontend
- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## License

MIT
