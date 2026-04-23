require("dotenv").config({ path: "/root/cozinhai/.env" });

module.exports = {
  apps: [
    {
      name: "cozinhai",
      script: "server/dist/index.js",
      cwd: "/root/cozinhai",
      interpreter: "node",
      env_file: "/root/cozinhai/.env",
      env: {
        NODE_ENV: "production",
        PORT: 3100,
        TZ: "America/Sao_Paulo",
      },
      max_memory_restart: "500M",
      restart_delay: 3000,
      max_restarts: 10,
      watch: false,
      error_file: "/var/log/cozinhai/error.log",
      out_file: "/var/log/cozinhai/out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
