import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { defineConfig, Plugin } from 'vite';

function payboxArtifactServer(): Plugin {
  return {
    name: 'paybox-artifact-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        
        // Match download routes
        if (
          url === '/plugin.mjs' ||
          url === '/dist/plugin.mjs' ||
          url === '/api/download/plugin.mjs' ||
          url === '/download/plugin.mjs'
        ) {
          const filePath = path.resolve(process.cwd(), 'dist/plugin.mjs');
          if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            const content = fs.readFileSync(filePath);
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="plugin.mjs"');
            res.setHeader('Content-Length', stat.size);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(content);
            return;
          }
        }

        if (url === '/api/bundle-info') {
          const filePath = path.resolve(process.cwd(), 'dist/plugin.mjs');
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath);
            const sha256 = crypto.createHash('sha256').update(content).digest('hex');
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({
              filename: 'plugin.mjs',
              bytes: content.length,
              sha256,
              status: 'ready'
            }));
            return;
          }
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), payboxArtifactServer()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
