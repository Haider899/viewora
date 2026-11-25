import { app } from './app.js';
import { env } from './config/env.js';
import { BootstrapService } from './services/bootstrap.service.js';

const server = app.listen(env.PORT, () => {
  console.log(`=========================================`);
  console.log(`  U-Ads API Engine Started`);
  console.log(`  Port: ${env.PORT}`);
  console.log(`  Environment: ${env.NODE_ENV}`);
  console.log(`  API Base: http://localhost:${env.PORT}${env.API_PREFIX}`);
  console.log(`=========================================`);

  if (env.NODE_ENV !== 'test') {
    BootstrapService.ensurePlatformDefaults()
      .then(() => console.log('✔ U-Ads platform defaults & seed data verified.'))
      .catch((err) => console.error('Bootstrap defaults warning:', err));
  }
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated.');
  });
});
