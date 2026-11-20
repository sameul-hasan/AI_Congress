import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  server: {
    port: 8080,
    open: '/index.html',
    proxy: {
      '/ws': {
        target: 'ws://localhost:8089',
        ws: true,
        changeOrigin: true,
      },
      '/events': {
        target: 'http://localhost:8089',
        changeOrigin: true,
      },
      // Proxy all /api/* to the edge gateway (auth, telemetry, audit, qal3, alerts, carbon, ai)
      '/api': {
        target: 'http://localhost:8089',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    {
      name: 'copy-pwa-assets',
      closeBundle() {
        const out = resolve(__dirname, 'dist');
        if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
        const distJs = resolve(out, 'js');
        if (!fs.existsSync(distJs)) fs.mkdirSync(distJs, { recursive: true });
        
        ['sw.js', 'manifest.json', 'worker_export.js'].forEach(file => {
          const src = resolve(__dirname, file);
          const dest = resolve(out, file);
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`[Vite Build] Copied ${file} to dist/`);
          }
        });

        const themeSrc = resolve(__dirname, 'js/theme.js');
        if (fs.existsSync(themeSrc)) {
          fs.copyFileSync(themeSrc, resolve(distJs, 'theme.js'));
          console.log(`[Vite Build] Copied js/theme.js to dist/js/theme.js`);
        }

        // Ensure assets directory is also mirrored into dist/assets
        const assetsSrc = resolve(__dirname, 'assets');
        const assetsDest = resolve(out, 'assets');
        if (fs.existsSync(assetsSrc)) {
          if (!fs.existsSync(assetsDest)) fs.mkdirSync(assetsDest, { recursive: true });
          fs.readdirSync(assetsSrc).forEach(f => {
            fs.copyFileSync(resolve(assetsSrc, f), resolve(assetsDest, f));
          });
          console.log('[Vite Build] Mirrored assets/ into dist/assets/');
        }

        // Synchronize production hashed bundle chunks into dist/sw.js precache manifest
        const distSwPath = resolve(out, 'sw.js');
        if (fs.existsSync(distSwPath) && fs.existsSync(assetsDest)) {
          const chunkFiles = fs.readdirSync(assetsDest)
            .filter(f => f.endsWith('.js') || f.endsWith('.css') || f.endsWith('.svg') || f.endsWith('.png'))
            .map(f => `./assets/${f}`);
          const prodAssets = [
            './',
            './index.html',
            './landing.html',
            './auth.html',
            './manifest.json',
            './worker_export.js',
            ...chunkFiles
          ];
          let swContent = fs.readFileSync(distSwPath, 'utf8');
          const formattedList = prodAssets.map(c => `  '${c}',`).join('\n');
          swContent = swContent.replace(
            /const PRECACHE_ASSETS = \[[\s\S]*?\];/,
            `const PRECACHE_ASSETS = [\n${formattedList}\n];`
          );
          fs.writeFileSync(distSwPath, swContent, 'utf8');
          console.log(`[Vite Build] Cleaned dist/sw.js precache manifest with ${prodAssets.length} verified production assets`);
        }
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        landing: resolve(__dirname, 'landing.html'),
        auth: resolve(__dirname, 'auth.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('js/documentGenerator.js')) {
            return 'engine-export';
          }
          if (id.includes('js/ragEngine.js')) {
            return 'engine-rag';
          }
          if (id.includes('js/charts.js')) {
            return 'vendor-charts';
          }
          if (id.includes('js/pages/admin.js') || id.includes('js/pages/webhooks.js')) {
            return 'pages-admin';
          }
          if (id.includes('js/pages/ai.js') || id.includes('js/pages/scenario.js') || id.includes('js/pages/carboniq.js') || id.includes('js/pages/energybrain.js')) {
            return 'pages-intelligence';
          }
          if (id.includes('js/pages/compliance.js') || id.includes('js/pages/calibration.js') || id.includes('js/pages/climateshield.js') || id.includes('js/pages/comparison.js')) {
            return 'pages-compliance';
          }
          if (id.includes('js/pages/dashboard.js') || id.includes('js/pages/cems.js') || id.includes('js/pages/emissions.js')) {
            return 'pages-core';
          }
        }
      }
    },
    outDir: 'dist',
    sourcemap: true,
  },
});
