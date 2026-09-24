import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Los datos van a mira-api via VITE_API_URL (sin proxy Vite).
export default defineConfig({
  plugins: [react()],
});
