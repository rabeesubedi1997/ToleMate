# ToleMate - Local Service Marketplace

A fully dynamic, scalable Local Service Marketplace Platform (Uber-like for services) using Laravel backend + React web frontend + React Native mobile apps + MySQL database.

## Project Structure

```
ToleMate/
├── backend/                 # Laravel API Backend
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── AuthController.php
│   │   │   └── ServiceController.php
│   │   └── Models/
│   ├── database/migrations/  # 13 Database Tables
│   ├── routes/api.php       # API Routes
│   └── bootstrap/app.php   # Laravel Configuration
├── frontend/               # React Web Frontend
│   ├── src/
│   │   ├── components/Layout/
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Services.tsx
│   │   │   └── ServicesDetail.tsx
│   │   └── App.tsx
│   └── package.json
├── development_prompt.md   # Complete Development Specification
└── local_service_marketplace_spec.txt  # Original Requirements
```

## Current Status: Phase 1 Complete ✅

### Backend Features (Laravel)
- ✅ Complete database structure with 13 tables
- ✅ Laravel Sanctum authentication system
- ✅ API endpoints for authentication and services
- ✅ Location-based service search
- ✅ Multi-language support infrastructure
- ✅ Mobile device management
- ✅ Offline sync capability

### Frontend Features (React)
- ✅ Modern, responsive UI with custom design system
- ✅ Authentication pages (Login/Register)
- ✅ Service listing and detail pages
- ✅ Beautiful color theme (Blue gradients + Yellow accents)
- ✅ Mobile-first responsive design
- ✅ Custom CSS framework

### Database Tables
1. `users` - User management with biometric support
2. `vendors` - Vendor profiles and business info
3. `categories` - Hierarchical service categories
4. `services` - Service listings with pricing
5. `service_images` - Service image galleries
6. `bookings` - Booking management system
7. `booking_requests` - Customer quote requests
8. `messages` - In-app messaging
9. `reviews` - Rating and review system
10. `notifications` - User notifications
11. `translations` - Multi-language support (EN/NP)
12. `mobile_devices` - Mobile device management
13. `offline_sync` - Offline functionality

## Getting Started

### Backend Setup
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```
Backend runs on: http://localhost:8000

### Frontend Setup
```bash
cd frontend
npm install
npm start
```
Frontend runs on: http://localhost:3000

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout (protected)
- `GET /api/user` - Get current user (protected)
- `PUT /api/user/profile` - Update profile (protected)

### Services
- `GET /api/services` - List services (with search/filter)
- `GET /api/services/{id}` - Get service details
- `POST /api/services` - Create service (protected, vendors only)
- `PUT /api/services/{id}` - Update service (protected)
- `DELETE /api/services/{id}` - Delete service (protected)
- `GET /api/services/search` - Search services

## Next Phase (Phase 2)
1. Booking system implementation
2. In-app messaging system
3. Vendor dashboard
4. Customer dashboard
5. Real-time notifications
6. Payment integration
7. React Native mobile app
8. Multi-language implementation
9. Advanced search and filtering
10. Review and rating system

## Tech Stack

### Backend
- **Laravel 10+** - PHP Framework
- **MySQL** - Database
- **Laravel Sanctum** - API Authentication
- **Eloquent ORM** - Database Management

### Frontend
- **React 18+** - Frontend Framework
- **TypeScript** - Type Safety
- **React Router** - Navigation
- **Axios** - HTTP Client
- **Custom CSS** - Styling (replaced Tailwind)

### Future Mobile
- **React Native** - Mobile App Development
- **Firebase** - Push Notifications
- **AsyncStorage** - Local Storage

## Features Implemented

### Core Features
- ✅ User authentication with biometric support
- ✅ Service management and discovery
- ✅ Location-based search
- ✅ Multi-language infrastructure
- ✅ Mobile app support foundation
- ✅ Beautiful, modern UI design

### Advanced Features
- ✅ Device token management
- ✅ Offline sync capability
- ✅ Hierarchical categories
- ✅ Rating system foundation
- ✅ Image galleries
- ✅ Responsive design

## Design System

### Colors
- **Primary**: Blue gradient (#0284c7 to #0ea5e9)
- **Accent**: Yellow (#facc15)
- **Neutral**: Grayscale palette (#fafafa to #171717)

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700

### Components
- Custom buttons with hover effects
- Card layouts with shadows
- Input fields with focus states
- Gradient backgrounds
- Responsive grid system

---

**Development Status**: Phase 1 Complete - Ready for Phase 2
**Last Updated**: May 4, 2026
