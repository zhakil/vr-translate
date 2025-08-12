module.exports = {
  apps: [
    {
      name: 'vr-translate-backend',
      script: 'dist/index.js',
      instances: 1, // Can be set to 'max' for cluster mode
      exec_mode: 'fork', // Use 'cluster' for load balancing
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        WEBSOCKET_PORT: 8081,
        LOG_LEVEL: 'info'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 8080,
        WEBSOCKET_PORT: 8081,
        LOG_LEVEL: 'debug',
        DEBUG_MODE: true
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
        WEBSOCKET_PORT: 8081,
        LOG_LEVEL: 'info'
      },
      // Logging configuration
      log_file: './logs/pm2.log',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Auto restart configuration
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Monitoring
      pmx: true,
      monitoring: false,
      
      // Source map support
      source_map_support: true,
      
      // Process behavior
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Health check
      health_check_url: 'http://localhost:8080/health',
      health_check_grace_period: 3000
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/vr-translate.git',
      path: '/var/www/vr-translate',
      'post-deploy': 'cd backend && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'post-setup': 'cd backend && npm install && npm run build',
      env: {
        NODE_ENV: 'production'
      }
    },
    
    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/vr-translate.git',
      path: '/var/www/vr-translate-staging',
      'post-deploy': 'cd backend && npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};