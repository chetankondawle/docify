const express = require('express');
const healthRoutes = require('./healthRoutes');
const documentRoutes = require('./documentRoutes');
const ocrRoutes = require('./ocrRoutes');
const tamperingRoutes = require('./tamperingRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/documents', documentRoutes);
router.use('/ocr', ocrRoutes);
router.use('/tampering', tamperingRoutes);

// Register additional v1 routes here:
// router.use('/users', userRoutes);
// router.use('/auth', authRoutes);

module.exports = router;
