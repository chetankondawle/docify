const { User, Document } = require('../models');
const documentService = require('../services/documentService');
const { deleteFile } = require('../utils/fileHelpers');
const { sendSuccess, sendCreated, sendError, sendNotFound } = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../utils/logger');

const createUser = asyncHandler(async (req, res) => {
  const { username, mobile, dob, pan, salary, address } = req.body;

  if (!username || !mobile || !dob || !pan || !salary || !address) {
    return sendError(res, 400, 'All fields are required: full name, mobile, dob, pan, salary, address');
  }

  const user = await User.create({ username, mobile, dob, pan, salary, address });

  sendCreated(res, {
    id: user.id,
    username: user.username,
    mobile: user.mobile,
    dob: user.dob,
    pan: user.pan,
    salary: user.salary,
    address: user.address,
    createdAt: user.createdAt,
  }, 'User created successfully');
});

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    include: [{
      model: Document,
      as: 'documents',
      required: false,
    }],
    order: [['createdAt', 'DESC']],
  });

  const result = users.map(user => ({
    id: user.id,
    username: user.username,
    mobile: user.mobile,
    dob: user.dob,
    pan: user.pan,
    salary: user.salary,
    address: user.address,
    createdAt: user.createdAt,
    documents: user.documents || [],
    documentCount: user.documents ? user.documents.length : 0,
  }));

  sendSuccess(res, result, 'Users retrieved successfully');
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    include: [{
      model: Document,
      as: 'documents',
      required: false,
    }],
  });

  if (!user) {
    return sendNotFound(res, 'User not found');
  }

  sendSuccess(res, {
    id: user.id,
    username: user.username,
    mobile: user.mobile,
    dob: user.dob,
    pan: user.pan,
    salary: user.salary,
    address: user.address,
    createdAt: user.createdAt,
    documents: user.documents || [],
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) {
    return sendNotFound(res, 'User not found');
  }

  const docs = await documentService.deleteDocumentsByUserId(user.id);
  for (const doc of docs) {
    try {
      await deleteFile(doc.path);
    } catch (error) {
      logger.warn(`File deletion failed for ${doc.path}: ${error.message}`);
    }
  }

  await user.destroy();

  sendSuccess(res, null, 'User and associated documents deleted successfully');
});

module.exports = { createUser, getUsers, getUser, deleteUser };