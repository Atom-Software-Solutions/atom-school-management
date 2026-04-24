// Simple JWT token decoder for debugging
// Install: npm install jsonwebtoken (if not already installed)

const jwt = require('jsonwebtoken');

// Replace this with your actual token
const token = 'YOUR_TOKEN_HERE';

try {
  // Decode without verification first to see the payload
  const decoded = jwt.decode(token, { complete: true });
  console.log('Token payload:', decoded.payload);
  
  // Now verify with the secret (this should match your JWT_SECRET or default secret)
  const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  const verified = jwt.verify(token, secret);
  console.log('Token is valid:', verified);
} catch (error) {
  console.error('Error:', error.message);
}
