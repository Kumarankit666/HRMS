const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const {
  listDepartments, addDepartment,
  listVideosAdmin, addVideo, deleteVideo,
  listQuestionsAdmin, addQuestion, deleteQuestion,
  assignTraining, unassignTraining,
  assignRetake, cancelRetake,
  overview, employeeDetail
} = require('../controllers/trainingAdmin.controller');

router.use(authenticate, requirePermission('MANAGE_TRAINING'));

router.get('/departments', listDepartments);
router.post('/departments', addDepartment);

router.get('/videos', listVideosAdmin);
router.post('/videos', addVideo);
router.delete('/videos/:id', deleteVideo);

router.get('/questions', listQuestionsAdmin);
router.post('/questions', addQuestion);
router.delete('/questions/:id', deleteQuestion);

router.post('/assign', assignTraining);
router.delete('/assign/:employeeId/:departmentId', unassignTraining);

router.post('/retake', assignRetake);
router.post('/retake/cancel', cancelRetake);

router.get('/overview', overview);
router.get('/employee/:employeeId/:departmentId', employeeDetail);

module.exports = router;