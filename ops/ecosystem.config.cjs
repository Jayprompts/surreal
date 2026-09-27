// PM2 processes on the VPS (the deploy copies this file to the site root and runs `pm2 startOrReload`).
// One instance each on purpose: session counting and the voice router will keep state in memory.
const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'surreal-api',
      cwd: path.join(__dirname, 'api'),
      script: 'dist/server.js',
      node_args: '--env-file=.env', // api/.env exists only on the server (chmod 600)
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M',
      kill_timeout: 10000, // matches the graceful-shutdown timeout in server.ts
      time: true,
    },
    {
      name: 'surreal-web',
      cwd: path.join(__dirname, 'web-app', 'web'), // Next.js standalone build
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      time: true,
      // Not secrets: the website's public Supabase settings are baked in at build time.
      env: { NODE_ENV: 'production', PORT: '3300', HOSTNAME: '127.0.0.1', API_URL: 'http://127.0.0.1:4300' },
    },
  ],
};
