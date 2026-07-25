const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { listMine, markAllRead } = require('../controllers/notifications.controller');

router.use(authenticate);

router.get('/', listMine);
router.post('/mark-read', markAllRead);

module.exports = router;