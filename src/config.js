// config.js - Vite Environment Variables
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

console.log('🔥 API_URL:', API_URL);
console.log('🌍 Mode:', import.meta.env.MODE);