const router = require('express').Router();
const { listPublicLeadership } = require('../controllers/leadership.controller');

router.get('/', listPublicLeadership);

module.exports = router;