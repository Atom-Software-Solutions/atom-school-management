# School Management System - React Frontend

A modern React application for the School Management System authentication, built with Vite, React Router, and Axios.

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── auth/
│   │       └── ProtectedRoute.jsx    # Protected route wrapper
│   ├── context/
│   │   └── AuthContext.jsx           # Authentication context
│   ├── pages/
│   │   ├── Login.jsx                 # Login page
│   │   ├── Register.jsx              # Registration page
│   │   └── Dashboard.jsx             # Dashboard page
│   ├── services/
│   │   ├── config.js                 # API configuration
│   │   └── api.js                    # Axios API client
│   ├── styles/
│   │   └── auth.css                  # Authentication styles
│   ├── App.jsx                       # Main app component with routes
│   ├── main.jsx                      # App entry point
│   └── index.css                     # Global styles
├── .env                              # Environment variables
├── package.json
└── vite.config.js                    # Vite configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend server running on `http://localhost:3000`

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and visit:
```
http://localhost:5173
```

## 📋 Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## ⚙️ Configuration

### Environment Variables

The `.env` file is already created with:

```env
VITE_API_URL=http://localhost:3000
```

Change this to match your backend URL if different.

### Backend CORS Setup

Make sure your NestJS backend allows requests from the frontend. In `src/main.ts`:

```typescript
app.enableCors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
});
```

## ✨ Features

### 🔐 Authentication System

- **Login Page** (`/login`)
  - Email and password authentication
  - Form validation
  - "Remember Me" functionality
  - Forgot password link (placeholder)
  - Error handling with user-friendly messages
  - Loading states

- **Register Page** (`/register`)
  - User registration with first name, last name, email, password
  - Password confirmation validation
  - Real-time password strength indicator
  - Terms and conditions checkbox
  - Comprehensive validation rules
  - Success feedback with auto-redirect

- **Dashboard Page** (`/dashboard`)
  - Protected route (requires authentication)
  - Displays user information
  - Logout functionality

### 🛡️ Protected Routes

Routes are protected using the `ProtectedRoute` component:
- Checks authentication status
- Redirects to login if not authenticated
- Shows loading spinner while checking auth

### 🎨 Modern UI/UX

- Responsive design (mobile-friendly)
- Purple gradient theme
- Smooth animations and transitions
- Visual feedback for all interactions
- Clean, professional appearance

## 🔌 API Integration

The app connects to your NestJS backend using the following endpoints from your Postman collection:

### Authentication Endpoints

```javascript
// Register
POST /auth/register
Body: { email, firstName, lastName, password }

// Login
POST /auth/login
Body: { email, password }
Response: { token/access_token }

// Get Profile
GET /auth/profile
Headers: Authorization: Bearer <token>
```

### Using the API Service

```javascript
import { authService } from './services/api';

// Login
await authService.login(email, password);

// Register
await authService.register({ firstName, lastName, email, password });

// Get Profile
const profile = await authService.getProfile();

// Logout
authService.logout();
```

## 🎯 Using Auth Context

The `AuthContext` provides authentication state throughout the app:

```javascript
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, loading, login, register, logout } = useAuth();
  
  // user: Current user object
  // isAuthenticated: Boolean auth status
  // loading: Loading state
  // login: Login function
  // register: Register function
  // logout: Logout function
}
```

## 🧪 Testing

### Quick Test

1. **Start Backend** (in project root):
```bash
npm run start:dev
```

2. **Start Frontend** (in frontend directory):
```bash
npm run dev
```

3. **Test Registration**:
   - Visit http://localhost:5173/register
   - Fill in: First Name, Last Name, Email, Password (e.g., `Password123!`)
   - Confirm password and agree to terms
   - Click "Create Account"

4. **Test Login**:
   - Visit http://localhost:5173/login (or wait for redirect)
   - Enter email and password
   - Click "Login"

5. **Test Dashboard**:
   - Should automatically redirect to `/dashboard`
   - View user information
   - Click "Logout" to test logout

### Password Requirements

Passwords must meet these requirements:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*, etc.)

**Valid Examples**: `Password123!`, `SecurePass1@`, `MyP@ssw0rd`

## 🐛 Troubleshooting

### "Network Error" / CORS Issues

**Problem**: Cannot connect to backend API

**Solutions**:
1. Verify backend is running: `curl http://localhost:3000/auth/profile`
2. Check `.env` has correct `VITE_API_URL`
3. Enable CORS in backend `src/main.ts`:
```typescript
app.enableCors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
});
```

### Form Validation Errors

**Problem**: Forms show validation errors

**Solution**: Forms have client-side validation. Fix the highlighted errors before submitting.

### Token Not Saving

**Problem**: Not staying logged in

**Solutions**:
1. Check browser localStorage (F12 → Application → Local Storage)
2. Verify API returns `token` or `access_token` field
3. Check browser console for errors

### Blank Page / White Screen

**Problem**: App doesn't load

**Solutions**:
1. Check browser console for errors (F12)
2. Verify all dependencies are installed: `npm install`
3. Clear browser cache and restart dev server

## 📦 Building for Production

```bash
# Build the app
npm run build

# Preview production build
npm run preview

# Deploy the dist/ folder
```

### Production Environment

Create `.env.production`:
```env
VITE_API_URL=https://your-production-api.com
```

## 🚀 Next Steps

### Immediate
- ✅ Test authentication flow
- ✅ Verify API integration
- ✅ Check responsive design

### Short-term
- [ ] Add password reset functionality
- [ ] Implement email verification
- [ ] Add profile editing page
- [ ] Create navigation menu

### Long-term
- [ ] Build student management pages
- [ ] Add classroom management
- [ ] Implement assessment tracking
- [ ] Create reports and analytics

## 🛠️ Tech Stack

- **React 18** - UI library
- **Vite** - Build tool (fast!)
- **React Router 6** - Routing
- **Axios** - HTTP client
- **Context API** - State management
- **CSS3** - Styling

## 📚 Resources

- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [React Router Docs](https://reactrouter.com)
- [Axios Docs](https://axios-http.com)

## 📄 License

Same as the main project.
