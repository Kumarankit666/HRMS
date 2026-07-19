const router = require('express').Router();
const { authenticate, requirePermission, requireRole } = require('../middleware/auth');
const {
  addEmployee, updateEmployee, assignManager, setStatus,
  resetEmployeePassword, listEmployees, getEmployee
} = require('../controllers/employee.controller');

router.use(authenticate);

router.get('/', listEmployees);
router.get('/:id', getEmployee);
router.post('/', requirePermission('MANAGE_EMPLOYEES'), addEmployee);
router.patch('/:id', requirePermission('MANAGE_EMPLOYEES'), updateEmployee);
router.patch('/:id/manager', requirePermission('MANAGE_EMPLOYEES'), assignManager);
router.patch('/:id/status', requirePermission('MANAGE_EMPLOYEES'), setStatus);
router.post('/:id/reset-password', requirePermission('RESET_EMPLOYEE_PASSWORD'), resetEmployeePassword);

module.exports = router;
