import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Mobile debugging console (only in development)
if (import.meta.env.DEV) {
  import('eruda').then(({ default: eruda }) => {
    eruda.init();
    console.log('📱 Eruda mobile console activated! Tap the icon at bottom-right to open.');
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
