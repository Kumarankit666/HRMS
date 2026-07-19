const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getStats } = require('../controllers/dashboard.controller');

router.use(authenticate);
router.get('/', getStats);

module.exports = router;
