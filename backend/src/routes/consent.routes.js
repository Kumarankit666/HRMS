const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { myPending, requestOtp, verifyAndSign } = require('../controllers/consent.controller');

router.use(authenticate);

router.get('/pending', myPending);
router.post('/:policyId/request-otp', requestOtp);
router.post('/:policyId/verify', verifyAndSign);

module.exports = router;