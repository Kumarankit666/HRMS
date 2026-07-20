const router = require('express').Router();
const { listPublicFaculty } = require('../controllers/faculty.controller');

router.get('/', listPublicFaculty);

module.exports = router;