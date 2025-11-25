// config.js - API Configuration
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

console.log('🔥🔥🔥 Environment Variables:');
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('API_URL being used:', apiUrl);
console.log('🔥🔥🔥');

export const API_URL = apiUrl;