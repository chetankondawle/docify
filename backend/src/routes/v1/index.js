const express = require('express');
const healthRoutes = require('./healthRoutes');
const documentRoutes = require('./documentRoutes');
const ocrRoutes = require('./ocrRoutes');
const tamperingRoutes = require('./tamperingRoutes');
const validateRoutes = require('./validateRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/documents', documentRoutes);
router.use('/ocr', ocrRoutes);
router.use('/tampering', tamperingRoutes);
router.use('/validate', validateRoutes);

const userRoutes = require('./userRoutes');

router.use('/users', userRoutes);

// Register additional v1 routes here:
// router.use('/auth', authRoutes);

module.exports = router;
