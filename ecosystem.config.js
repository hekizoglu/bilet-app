module.exports = {
  apps: [
    {
      name: "bilet-backend",
      script: "./backend/index.js",
      instances: "max",
      exec_mode: "cluster",
      node_args: "--trace-sync-io",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      }
    }
  ]
};
