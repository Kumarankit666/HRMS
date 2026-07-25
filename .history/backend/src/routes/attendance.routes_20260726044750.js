const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { myAttendance, listAttendance, markAttendance, markBulk, allEmployeesSummary } = require('../controllers/attendance.controller');

router.use(authenticate);

router.get('/me', myAttendance);
router.get('/summary', requirePermission('MANAGE_ATTENDANCE'), allEmployeesSummary);
router.get('/', listAttendance);
router.post('/', requirePermission('MANAGE_ATTENDANCE'), markAttendance);
router.post('/bulk', requirePermission('MANAGE_ATTENDANCE'), markBulk);

module.exports = router;