// @ts-nocheck
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

// Read version from root package.json (single source of truth for OTA versioning)
const rootPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));
const APP_VERSION = rootPkg.version || '1.0.0';

// Vite plugin to execute /api/*.js serverless endpoints in local dev mode (npm run dev)
function viteApiDevPlugin() {
  return {
    name: 'vite-api-dev-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const urlPath = req.url.split('?')[0];
        const baseName = urlPath.replace('/api/', '');
        
        let filePath = path.resolve(process.cwd(), 'api', baseName + '.ts');
        if (!fs.existsSync(filePath)) {
            filePath = path.resolve(process.cwd(), 'api', baseName + '.js');
        }

        if (!fs.existsSync(filePath)) {
          return next();
        }

        try {
          // Populate process.env from .env if needed
          const env = loadEnv('development', process.cwd(), '');
          Object.assign(process.env, env);

          // Parse POST body if present
          if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
            const buffers: Buffer[] = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            const rawBody = Buffer.concat(buffers).toString('utf-8');
            try {
              req.body = JSON.parse(rawBody);
            } catch {
              req.body = {};
            }
          }

          // Polyfill express/vercel response helpers
          if (!res.status) {
            res.status = (code: number) => {
              res.statusCode = code;
              return res;
            };
          }
          if (!res.json) {
            res.json = (data: any) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
              return res;
            };
          }

          const handlerModule = await server.ssrLoadModule(filePath);
          const handler = handlerModule.default;

          if (typeof handler === 'function') {
            await handler(req, res);
          } else {
            next();
          }
        } catch (err: any) {
          console.error(`[Vite API Dev Plugin Error for ${urlPath}]:`, err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message || 'Internal API Error' }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: '/game/',
  define: {
    // Expose app version from package.json at build time
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_VERSION),
  },
  plugins: [
    viteApiDevPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false,
      devOptions: { enabled: false },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Exclude all CDN-served heavy assets — these are fetched on-demand
        // from Cloudflare Edge (aya-assets-proxy worker) with smart buffering,
        // so precaching them would bloat the SW install by 200+ MB for nothing.
        globIgnores: [
          '**/music/**',
          '**/*.mp3',
          '**/*.m4a',
          '**/*.mp4',
          '**/map_frames_solar/**',
          '**/map_frames_dark/**',
          '**/map_frames/**',
          '**/mascot_frames/**',
          '**/images/antigravity/**',
          '**/portraits/**',
        ],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15MB — handles images and bundle
      },
    })
  ],
  server: {
    host: true, // Exposes the server to the network
    watch: {
      ignored: [
        '**/node_modules/**', 
        '**/dist/**', 
        '**/.git/**', 
        '**/public/**', 
        '**/.agents/**', 
        '**/android/**'
      ]
    }
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('styled-components') || id.includes('tailwindcss')) {
              return 'ui-vendor';
            }
            if (id.includes('@supabase/supabase-js')) {
              return 'db-vendor';
            }
            if (id.includes('@capacitor')) {
              return 'native-vendor';
            }
            return 'vendor'; // Fallback for other node_modules
          }
        }
      }
    }
  },
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.{ts,tsx}'],
    include: []
  }
})
