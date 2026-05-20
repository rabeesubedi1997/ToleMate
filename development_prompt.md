# TOLEMATE - LOCAL SERVICE MARKETPLACE DEVELOPMENT PROMPT

## PROJECT OVERVIEW
Build ToleMate - a fully dynamic, scalable Local Service Marketplace Platform (Uber-like for services) using Laravel backend + React web frontend + React Native mobile apps + MySQL database. Final deliverable includes production-ready APK file for Android deployment.

## TECHNICAL REQUIREMENTS

### Backend (Laravel)
- REST API architecture with Laravel 10+
- Laravel Sanctum for authentication
- Modular controller structure
- API response time target: <300ms
- Comprehensive validation and error handling

### Frontend (React Web)
- React 18+ with functional components
- Mobile-first responsive design
- TailwindCSS for styling
- Axios for API communication
- State management (Context API or Redux)
- Internationalization (i18n) support for English/Nepali
- RTL layout support for Nepali script

### Mobile App (React Native)
- React Native 0.72+ for cross-platform development
- Native navigation (React Navigation)
- Offline-first architecture with data synchronization
- Push notifications (Firebase Cloud Messaging)
- Native device features (GPS, Camera, Contacts)
- Biometric authentication support
- Local storage for offline functionality
- APK generation for Android deployment

### Database (MySQL)
- Optimized schema with proper indexing
- Foreign key relationships
- Soft deletes where appropriate

## CORE FEATURES TO IMPLEMENT

### 1. Authentication System
- User registration/login (Customer, Vendor, Admin roles)
- Email verification
- Password reset
- Profile management with location (lat/lng)
- Biometric authentication (fingerprint/face ID) for mobile app
- Social login integration (Google, Facebook)
- Two-factor authentication support

### 2. Dynamic Service System
- Vendors can create unlimited services dynamically
- Service fields: name, description, category_id, pricing_type, price, images, service_area_radius, is_active, tags
- Service image upload/management
- Service activation/deactivation

### 3. Advanced Search System
- Global search with natural language processing
- Location-based filtering (radius search)
- Category-based filtering
- Tag-based search
- Price range filtering
- Real-time search suggestions

### 4. Vendor Management System
- Vendor dashboard
- Business profile management
- Service portfolio management
- Availability calendar
- Service area radius settings
- Rating display

### 5. Dual Booking System
- **Instant Booking**: Fixed-price services with immediate confirmation
- **Quote Request System**: Custom services where vendors submit quotes
- Booking status tracking: pending, accepted, in_progress, completed, cancelled
- Scheduled booking management
- Location-based booking (customer's address)

### 6. Real-time Chat System
- Customer-vendor messaging linked to bookings
- Real-time message delivery (WebSocket/WebSockets)
- Message history
- File attachment support
- Read/unread status

### 7. Review & Rating System
- 5-star rating system
- Reviews only allowed after completed bookings
- Comment system
- Vendor rating aggregation
- Review moderation

### 8. Service Request Marketplace
- Customers can post custom service requests
- Vendors can respond with offers/quotes
- Request status management
- Competitive bidding system

### 9. Location Services
- Geolocation integration
- Radius-based service discovery
- Distance calculation
- Service area validation
- Map integration (Google Maps or similar)

### 10. Notification System
- Real-time notifications
- Email notifications
- Push notifications (future mobile app)
- Notification preferences

### 11. Multi-language Support
- Language selection (English/Nepali)
- Dynamic content translation
- RTL support for Nepali script
- Language-specific UI components
- Localized date/time formats
- Currency formatting by language

### 12. Mobile-App Specific Features
- Push notifications for booking updates and messages
- GPS integration for location-based services
- Camera integration for service photos and documents
- Offline mode with data synchronization
- In-app chat with real-time messaging
- Mobile payment integration
- QR code scanning for service verification
- Voice search capability
- Dark mode support
- App performance monitoring

## DATABASE STRUCTURE

### Required Tables:
1. **users** - id, name, email, password, phone, role, lat, lng, preferred_language, device_token, biometric_enabled, created_at, updated_at
2. **vendors** - id, user_id, business_name, description, rating, service_area_radius, created_at, updated_at
3. **categories** - id, name, parent_id, created_at, updated_at
4. **services** - id, vendor_id, category_id, name, description, pricing_type, price, is_active, radius, tags, created_at, updated_at
5. **service_images** - id, service_id, image_url, created_at
6. **bookings** - id, customer_id, vendor_id, service_id, booking_type, status, price, scheduled_time, lat, lng, created_at, updated_at
7. **booking_requests** - id, customer_id, text, lat, lng, status, created_at, updated_at
8. **messages** - id, booking_id, sender_id, receiver_id, message, created_at
9. **reviews** - id, booking_id, customer_id, vendor_id, rating, comment, created_at
10. **notifications** - id, user_id, title, message, is_read, created_at
11. **translations** - id, key, en_text, np_text, created_at, updated_at
12. **mobile_devices** - id, user_id, device_type, device_token, app_version, last_active, created_at
13. **offline_sync** - id, user_id, table_name, record_id, action, data, sync_status, created_at

## API ENDPOINTS TO IMPLEMENT

### Authentication
- POST /api/register
- POST /api/login
- POST /api/logout
- POST /api/forgot-password
- GET /api/user

### Services
- GET /api/services
- GET /api/services/{id}
- POST /api/services (vendor only)
- PUT /api/services/{id} (vendor only)
- DELETE /api/services/{id} (vendor only)
- GET /api/services/search

### Bookings
- GET /api/bookings
- POST /api/bookings
- PUT /api/bookings/{id}
- GET /api/bookings/{id}
- POST /api/booking-requests

### Chat
- GET /api/bookings/{id}/messages
- POST /api/bookings/{id}/messages
- GET /api/conversations

### Reviews
- GET /api/vendors/{id}/reviews
- POST /api/reviews
- GET /api/my-reviews

### Language & Translation
- GET /api/translations
- PUT /api/user/language
- GET /api/languages

### Mobile App Specific
- POST /api/mobile/register-device
- PUT /api/mobile/device-token
- POST /api/mobile/sync-offline
- GET /api/mobile/app-config
- POST /api/mobile/push-notification-token

## FRONTEND PAGES/COMPONENTS

### Public Pages
- Home/Landing page
- Services listing
- Service detail page
- Search results
- About/Contact

### Customer Pages
- Dashboard
- Profile management
- My bookings
- Chat interface
- Review submission
- Service requests

### Vendor Pages
- Vendor dashboard
- Service management
- Booking management
- Chat interface
- Business profile
- Analytics/Reports

### Admin Pages
- User management
- Service moderation
- System analytics
- Settings

### Mobile App Screens
- Splash screen with language selection
- Login/Registration with biometric option
- Home screen with service discovery
- Service search with filters
- Service detail page
- Booking flow
- Chat interface
- Profile management
- Notifications center
- Settings with language/theme options
- Offline mode indicator

## UI/UX REQUIREMENTS
- Clean, minimal design
- Card-based layouts
- Fast navigation
- Mobile-first responsive
- Loading states
- Error handling
- Form validation
- Image optimization
- Language switcher component
- RTL layout support for Nepali
- Localized content display
- Language-specific date/time formatting

## PERFORMANCE OPTIMIZATION
- Database query optimization
- API response caching
- Image lazy loading
- Pagination for large datasets
- CDN for static assets
- Gzip compression

## SECURITY REQUIREMENTS
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Secure file uploads
- API authentication

## TESTING REQUIREMENTS
- Unit tests for business logic
- Feature tests for API endpoints
- Frontend component testing
- Integration testing
- Performance testing

## DEPLOYMENT REQUIREMENTS
- Environment configuration
- Database migrations
- Asset compilation
- SSL certificate
- Backup strategy
- Monitoring setup

### Mobile App Deployment
- APK generation for Android
- App signing configuration
- Google Play Store preparation
- Version management system
- Crash reporting integration (Firebase Crashlytics)
- App performance monitoring
- Over-the-air (OTA) updates support
- Code obfuscation and security

## FUTURE SCALABILITY CONSIDERATIONS
- Mobile app API compatibility
- AI service matching preparation
- Payment gateway integration
- Multi-city support
- Subscription system
- Advanced analytics

## DEVELOPMENT MILESTONES

### Phase 1: Core Foundation
- Database setup and migrations
- Authentication system
- Basic CRUD operations
- API structure

### Phase 2: Service Management
- Dynamic service creation
- Service search and filtering
- Vendor dashboard
- Service images

### Phase 3: Booking System
- Instant booking
- Quote request system
- Booking management
- Status tracking

### Phase 4: Communication
- Chat system
- Notifications
- Review system

### Phase 5: Advanced Features
- Service requests marketplace
- Location services
- Admin panel
- Performance optimization
- Multi-language support implementation

### Phase 6: Mobile App Development
- React Native app setup and configuration
- Mobile UI/UX implementation
- Native device integrations (GPS, Camera, Biometrics)
- Push notification system
- Offline functionality and sync
- APK generation and testing
- App store deployment preparation

## SUCCESS METRICS
- API response time <300ms
- Mobile-friendly Google PageSpeed score >85
- Zero security vulnerabilities
- 99.9% uptime
- User satisfaction rating >4.5/5

This specification covers all requirements from the original document and provides a comprehensive roadmap for building ToleMate - a production-ready Local Service Marketplace Platform.

---

## PHASE 2 FIXES & FEATURE ADDITIONS (May 2026)

### Issues Fixed

#### 1. Authentication Middleware Mismatch
- **Problem**: `api.php` was using `auth:api` middleware; Laravel Sanctum requires `auth:sanctum`.
- **Fix**: Changed all protected route groups to `auth:sanctum`.

#### 2. Session & Role-Based Access Control
- **Problem**: Pages individually checked `localStorage` for auth; after logout, direct URL access to `/admin-dashboard` could bypass checks. No centralized route protection existed.
- **Fix**:
  - Created `AuthContext` (`context/AuthContext.tsx`) as a centralized auth state provider.
  - Created `ProtectedRoute` component (`components/ProtectedRoute.tsx`) with `allowedRoles` prop.
  - Wrapped all protected routes in `App.tsx` with `ProtectedRoute`, including role-specific routes (admin, vendor, customer).
  - `Login.tsx` now uses `AuthContext.login()` and redirects to the page the user came from (or role-based default).
  - `Header.tsx` uses `AuthContext.logout()` which calls the backend logout endpoint before clearing localStorage.
  - After logout, any direct URL visit to `/admin-dashboard`, `/vendor-dashboard`, or `/dashboard` redirects to `/login`.

#### 3. Booking Error on Service Select
- **Problem**: `BookService.tsx` was sending the token from raw `localStorage.getItem('token')` — inconsistent with Sanctum auth.
- **Fix**: Updated `BookService.tsx` to use `useAuth()` context token. Added `Accept: application/json` header. Improved service data response parsing (handles both `{service: {...}}` and flat `{...}` response shapes).

#### 4. Admin — Missing Vendor Management
- **Problem**: AdminDashboard had no Vendors tab; admin could not view vendors, their bookings, chats, or delete them.
- **Fix**:
  - Added `AdminDashboard` **Vendors tab** with full vendor list table.
  - Vendor detail view shows: vendor info, all their bookings (with status), and all chat messages.
  - Admin can **delete a vendor** (also deletes their services).
  - Added **role change dropdown** in Users tab — admin can change any user's role (customer/vendor/admin) inline.
  - Removed manual `localStorage` auth check from `AdminDashboard` (now handled by `ProtectedRoute`).
  - Added backend methods: `getVendors`, `deleteVendor`, `getVendorBookings`, `getVendorMessages` in `AdminController`.
  - Added backend routes: `GET /admin/vendors`, `DELETE /admin/vendors/{id}`, `GET /admin/vendors/{id}/bookings`, `GET /admin/vendors/{id}/messages`.

#### 5. Dummy/Placeholder Images for Services
- **Problem**: Services with no uploaded images showed empty gray boxes with emoji icons.
- **Fix**:
  - Created `utils/serviceImage.ts` with `getServiceImage()` utility — returns the first uploaded image if available, otherwise a category-specific Unsplash placeholder image.
  - Updated `Services.tsx` and `ServicesDetail.tsx` to use `getServiceImage()`.
  - Added `onError` fallback on all service images in case of broken URLs.
  - `ServicesDetail.tsx` now shows the service image at the top of the detail card.

#### 6. Home Page Hero Slider
- **Problem**: Home page had a static hero section; no image slider existed.
- **Fix**:
  - Created `components/HeroSlider.tsx` — auto-advancing carousel with prev/next arrows, dot indicators, and title overlay.
  - `Home.tsx` fetches `slider_images` setting from the API on load and renders the slider if images exist.
  - Admin can manage slider images from the new **Slider tab** in AdminDashboard:
    - Upload images (stored via `/api/admin/media`)
    - Set title and link (e.g., `/services/1`) per slide
    - Remove slides
    - Save all changes

### New Admin Dashboard Tabs
| Tab | Features |
|-----|----------|
| Overview | Stats + quick links to Users / Vendors |
| Users | List, edit role (inline dropdown), edit profile, delete |
| **Vendors** *(new)* | List all vendors; click to view bookings & chats; delete vendor |
| Services | List, edit, delete, add new |
| Media | Upload, view, delete media assets |
| **Slider** *(new)* | Upload slides, set title & link per slide, reorder, save |
| Reviews | List, delete |
| Settings | Site name, hero text, nav links |

### API Endpoints Added
- `GET /api/admin/vendors` — list all vendors with user info + services count
- `DELETE /api/admin/vendors/{id}` — delete vendor and their services
- `GET /api/admin/vendors/{id}/bookings` — all bookings for a vendor
- `GET /api/admin/vendors/{id}/messages` — all chat messages involving a vendor

### Pending / Future Work
- Service image upload via the Edit Service form (currently images are placeholder only)
- Vendor screen in the mobile app (folder exists but is empty)
- Real-time chat via WebSocket (currently polling/REST)
- Password reset flow
- Email verification
- Payment gateway integration (mock payment controller exists)

