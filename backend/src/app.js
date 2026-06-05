const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const { syncDatabase } = require('./config/database');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const logger = require('./utils/logger');

const app = express();

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

let dbSyncPromise = null;

const ensureDbSync = () => {
  if (!dbSyncPromise) {
    dbSyncPromise = syncDatabase(config.database.syncForce).catch(err => {
      logger.warn('Database sync failed. The app will run without DB:', err.message);
      dbSyncPromise = null;
    });
  }
  return dbSyncPromise;
};

// Begin sync eagerly on startup
ensureDbSync();

app.use(helmet({ crossOriginResourcePolicy: false }));

app.use(
  cors({
    origin: config.server.allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: config.upload.maxBodySize }));
app.use(express.urlencoded({ extended: true, limit: config.upload.maxBodySize }));

if (config.server.env !== 'test') {
  app.use(morgan('dev'));
}

app.use('/uploads', express.static(uploadsDir));

app.get('/health', async (req, res) => {
  await ensureDbSync();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: config.server.env,
    geminiConfigured: !!config.gemini.apiKey,
    uploadDirExists: fs.existsSync(uploadsDir),
    database: dbSyncPromise ? 'connected' : 'not connected',
  });
});

app.use('/api', routes);

app.use(notFound);

app.use(errorHandler);

module.exports = app;