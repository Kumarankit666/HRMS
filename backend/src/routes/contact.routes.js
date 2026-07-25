const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { submitQuery, listQueries, updateStatus } = require('../controllers/contact.controller');

router.post('/', submitQuery); // public, no auth

router.get('/admin/list', authenticate, requirePermission('MANAGE_EMPLOYEES'), listQueries);
router.patch('/admin/:id/status', authenticate, requirePermission('MANAGE_EMPLOYEES'), updateStatus);

module.exports = router;