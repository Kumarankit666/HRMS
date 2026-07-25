const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const {
  createRequest, myRequests, managerPending, managerDecision, hrPending, hrDecision
} = require('../controllers/attendanceRequest.controller');

router.use(authenticate);

router.post('/', createRequest);
router.get('/me', myRequests);
router.get('/manager-pending', managerPending);
router.post('/:id/manager-decision', managerDecision);
router.get('/hr-pending', requirePermission('MANAGE_ATTENDANCE'), hrPending);
router.post('/:id/hr-decision', requirePermission('MANAGE_ATTENDANCE'), hrDecision);

module.exports = router;