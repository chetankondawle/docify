const express = require('express');
const {
  createUser,
  getUsers,
  getUser,
  deleteUser,
} = require('../../controllers/userController');
const { defaultLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

router.post('/', defaultLimiter, createUser);
router.get('/', defaultLimiter, getUsers);
router.get('/:id', defaultLimiter, getUser);
router.delete('/:id', defaultLimiter, deleteUser);

module.exports = router;