const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { apply, listMine, myBalance, listPending, decide } = require('../controllers/leave.controller');

router.use(authenticate);

router.post('/', apply);
router.get('/me', listMine);
router.get('/balance', myBalance);
router.get('/pending', listPending);
router.post('/:id/decision', decide);

module.exports = router;
