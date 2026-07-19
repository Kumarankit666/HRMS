const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { listDepartments, listDesignations, listManagerOptions } = require('../controllers/reference.controller');

router.use(authenticate);

router.get('/departments', listDepartments);
router.get('/designations', listDesignations);
router.get('/managers', listManagerOptions);

module.exports = router;
