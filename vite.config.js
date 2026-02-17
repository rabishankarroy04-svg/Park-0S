import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Other server options (like 'port', 'open', etc.) can go here
    allowedHosts: [
      '4cf1bf47f8d0.ngrok-free.app',
      // You can add other hosts here if needed
    ],
  }
})
