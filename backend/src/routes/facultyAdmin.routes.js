const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { listAll, addFaculty, updateFaculty, deleteFaculty } = require('../controllers/facultyAdmin.controller');

router.use(authenticate, requirePermission('MANAGE_EMPLOYEES'));

router.get('/', listAll);
router.post('/', addFaculty);
router.patch('/:id', updateFaculty);
router.delete('/:id', deleteFaculty);

module.exports = router;