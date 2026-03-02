import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Hier teilen wir die App in logische Pakete auf
        manualChunks(id) {
          // Alles aus node_modules landet normalerweise im Vendor-Chunk
          if (id.includes('node_modules')) {
            // Speziell Supabase auslagern
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            // React & Router auslagern
            if (id.includes('react')) {
              return 'react-vendor';
            }
            // Alles andere in einen allgemeinen Vendor-Topf
            return 'vendor';
          }
        }
      }
    },
    // Optional: Erhöhe das Limit für die Warnung auf 1000kb, 
    // falls du trotzdem noch Warnungen kriegst (Supabase ist einfach groß)
    chunkSizeWarningLimit: 1000
  }
})