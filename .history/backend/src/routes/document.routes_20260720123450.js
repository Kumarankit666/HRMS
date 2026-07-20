const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { uploadDocument, myDocuments, listDocuments, verifyDocument, deleteDocument, DOC_TYPES } = require('../controllers/document.controller');

router.use(authenticate);

router.get('/types', (req, res) => res.json({ success: true, data: DOC_TYPES }));
router.post('/', uploadDocument);
router.get('/me', myDocuments);
router.get('/', requirePermission('MANAGE_EMPLOYEES'), listDocuments);
router.patch('/:id/verify', requirePermission('MANAGE_EMPLOYEES'), verifyDocument);
router.delete('/:id', deleteDocument);

module.exports = router;