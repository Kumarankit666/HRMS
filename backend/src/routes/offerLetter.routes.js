const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { generate, list } = require('../controllers/offerLetter.controller');

router.use(authenticate, requirePermission('GENERATE_LETTERS'));

router.get('/', list);
router.post('/:employeeId', generate);

module.exports = router;
