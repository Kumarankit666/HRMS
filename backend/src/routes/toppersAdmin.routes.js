const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { listAll, addTopper, updateTopper, deleteTopper } = require('../controllers/toppersAdmin.controller');

router.use(authenticate, requirePermission('MANAGE_EMPLOYEES'));

router.get('/', listAll);
router.post('/', addTopper);
router.patch('/:id', updateTopper);
router.delete('/:id', deleteTopper);

module.exports = router;