const router = require('express').Router();
const { listPublicJobs } = require('../controllers/jobs.controller');

router.get('/', listPublicJobs);

module.exports = router;