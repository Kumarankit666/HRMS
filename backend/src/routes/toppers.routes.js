const router = require('express').Router();
const { listPublicToppers } = require('../controllers/toppers.controller');

router.get('/', listPublicToppers);

module.exports = router;