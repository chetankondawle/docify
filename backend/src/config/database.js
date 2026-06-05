const { Sequelize } = require('sequelize');
const config = require('./index');
const logger = require('../utils/logger');

const sequelize = new Sequelize(config.database.url, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  },
  logging: config.server.env === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: false,
  },
});

const syncDatabase = async (force = false) => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    await sequelize.sync({ force });
    logger.info(`Database models synced${force ? ' (force: true)' : ''}.`);
  } catch (error) {
    logger.error('Unable to connect to the database:', error.message);
    throw error;
  }
};

module.exports = { sequelize, syncDatabase };