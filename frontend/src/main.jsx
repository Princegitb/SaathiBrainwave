import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Intercept global fetch to prepend backend API base URL automatically in production
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  if (typeof input === 'string' && input.startsWith('/api')) {
    input = `${API_BASE_URL}${input}`;
  } else if (input instanceof URL && input.pathname.startsWith('/api')) {
    input = `${API_BASE_URL}${input.pathname}${input.search}`;
  }
  return originalFetch.call(this, input, init);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
