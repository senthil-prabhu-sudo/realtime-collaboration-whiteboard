// ---- REQUIRED POLYFILL FOR SOCKJS (Vite compatibility) ----
(window as any).global = window;

import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
