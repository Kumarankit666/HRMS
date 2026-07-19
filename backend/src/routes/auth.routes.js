const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { login, me, forgotPassword, resetPassword } = require('../controllers/auth.controller');

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, me);

module.exports = router;
