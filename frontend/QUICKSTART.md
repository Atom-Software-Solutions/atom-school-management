# Quick Start Guide - React Frontend

Get up and running with the School Management System frontend in 5 minutes!

## ⚡ Super Quick Start

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Start the dev server (dependencies already installed!)
npm run dev

# 3. Open browser to http://localhost:5173
```

That's it! The app should now be running.

## 🧪 Test the App

### 1. Start Backend First
In a separate terminal, from the project root:
```bash
npm run start:dev
```

Backend should be running on `http://localhost:3000`

### 2. Test Registration

1. Go to http://localhost:5173/register
2. Fill in the form:
   - **First Name**: John
   - **Last Name**: Doe
   - **Email**: test@example.com
   - **Password**: Password123!
   - **Confirm Password**: Password123!
   - ✓ Check "I agree to terms"
3. Click "Create Account"
4. You should see success message and redirect to login

### 3. Test Login

1. On the login page (or go to http://localhost:5173/login)
2. Enter:
   - **Email**: test@example.com
   - **Password**: Password123!
3. Click "Login"
4. You should be redirected to the dashboard

### 4. Test Dashboard

- You should see your user information
- Click "Logout" to log out
- You'll be redirected back to login

## 🔧 If Something Goes Wrong

### Backend Not Running?
```bash
# In project root
npm run start:dev
```

### CORS Error?
Add this to your backend `src/main.ts`:
```typescript
app.enableCors({
  origin: ['http://localhost:5173'],
  credentials: true,
});
```

### Dependencies Missing?
```bash
npm install
```

### Port 5173 Already in Use?
The Vite dev server will automatically use the next available port (5174, 5175, etc.)

## 📱 What's Available

### Routes
- `/` - Redirects to login
- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - Protected dashboard (requires login)

### Features
- ✅ User registration
- ✅ User login
- ✅ Protected routes
- ✅ User profile display
- ✅ Logout functionality
- ✅ Form validation
- ✅ Password strength indicator
- ✅ Error handling
- ✅ Loading states
- ✅ Responsive design

## 🎨 Try These Features

1. **Password Strength Indicator**
   - Go to register page
   - Start typing a password
   - Watch the strength indicator change colors

2. **Form Validation**
   - Try submitting empty forms
   - Enter invalid email
   - Use mismatched passwords
   - See real-time validation errors

3. **Responsive Design**
   - Resize your browser window
   - Check mobile view (DevTools → Toggle Device Toolbar)

4. **Protected Routes**
   - Try accessing `/dashboard` without logging in
   - You'll be redirected to login

## 📖 Next Steps

- Read [README.md](README.md) for full documentation
- Explore the source code in `src/`
- Build additional features (students, classes, etc.)
- Customize the theme and styling

## 💡 Pro Tips

- **Hot Module Replacement**: Save any file and see changes instantly
- **React DevTools**: Install for easier debugging
- **API URL**: Change in `.env` file (`VITE_API_URL`)
- **Console**: Open DevTools (F12) to see API calls and errors

## 🆘 Need Help?

1. Check the browser console (F12) for errors
2. Check the Network tab to see API calls
3. Review [README.md](README.md) for detailed info
4. Check backend logs for API errors

Happy coding! 🚀
