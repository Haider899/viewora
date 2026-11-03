import { app } from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`=========================================`);
  console.log(`  VistaraX API Engine Started`);
  console.log(`  Port: ${env.PORT}`);
  console.log(`  Environment: ${env.NODE_ENV}`);
  console.log(`  API Base: http://localhost:${env.PORT}${env.API_PREFIX}`);
  console.log(`=========================================`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated.');
  });
});
