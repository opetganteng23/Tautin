// PM2 process definition for the production server.
// Start: pm2 start ecosystem.config.cjs   (port 5012, reverse-proxied by Caddy)
module.exports = {
  apps: [
    {
      name: "tautin",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 5012",
      env: { NODE_ENV: "production" },
      max_memory_restart: "400M",
    },
  ],
};
