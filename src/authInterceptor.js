// Attaches the logged-in user's JWT (saved as 'authToken' in localStorage by Login.jsx)
// to every outgoing request — both axios and native fetch — so individual
// components don't each need to remember to send it.
//
// Import this once, before the app renders (see main.jsx).

import axios from 'axios';

// ---- axios: attach to every request made with axios.get/post/put/delete/etc ----
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- fetch: attach to every request made with the native fetch() ----
const originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    init = {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    };
  }
  return originalFetch(input, init);
};