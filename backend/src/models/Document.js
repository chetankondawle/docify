const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: User,
      key: 'id',
    },
  },
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  path: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  mimetype: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  sizeFormatted: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  documentType: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  ocrData: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  ocrProcessed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  ocrError: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ocrModel: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  ocrProcessedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  formatValidation: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  pdfTampering: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  imageTampering: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  uploadedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

Document.beforeCreate((doc) => {
  doc.uploadedAt = doc.uploadedAt || new Date();
});

User.hasMany(Document, { foreignKey: 'userId', as: 'documents' });
Document.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = Document;