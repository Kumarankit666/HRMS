const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { listAll, addJob, updateJob, deleteJob, listApplications } = require('../controllers/jobsAdmin.controller');

router.use(authenticate, requirePermission('MANAGE_EMPLOYEES'));

router.get('/', listAll);
router.post('/', addJob);
router.patch('/:id', updateJob);
router.delete('/:id', deleteJob);
router.get('/applications', listApplications);

module.exports = router;