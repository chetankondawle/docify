const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { notEmpty: true },
  },
  mobile: {
    type: DataTypes.STRING(15),
    allowNull: false,
    validate: { notEmpty: true },
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  pan: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: { notEmpty: true },
  },
  salary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: { notEmpty: true },
  },
});

module.exports = User;