const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { getMyStatus, submit, listPending, review } = require('../controllers/onboarding.controller');

router.use(authenticate);

router.get('/me', getMyStatus);
router.post('/submit', submit);
router.get('/pending', requirePermission('MANAGE_EMPLOYEES'), listPending);
router.post('/:employeeId/review', requirePermission('MANAGE_EMPLOYEES'), review);

module.exports = router;
