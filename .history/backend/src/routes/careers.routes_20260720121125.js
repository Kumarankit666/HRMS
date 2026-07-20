const router = require('express').Router();
const { applyForJob } = require('../controllers/careers.controller');

router.post('/apply', applyForJob);

module.exports = router;