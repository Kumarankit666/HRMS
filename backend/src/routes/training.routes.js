const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { myDepartments, listVideos, getQuestions, submitTest, getCertificate } = require('../controllers/training.controller');

router.use(authenticate);

router.get('/my-departments', myDepartments);
router.get('/videos', listVideos);
router.get('/questions/:videoId', getQuestions);
router.post('/submit', submitTest);
router.get('/certificate/:departmentId', getCertificate);

module.exports = router;