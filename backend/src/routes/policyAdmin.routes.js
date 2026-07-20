const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { uploadPolicy, listPolicies, setPolicyActive, policyStatus } = require('../controllers/policyAdmin.controller');

router.use(authenticate, requirePermission('MANAGE_EMPLOYEES'));

router.get('/', listPolicies);
router.post('/', uploadPolicy);
router.patch('/:id/status', setPolicyActive);
router.get('/:id/status', policyStatus);

module.exports = router;