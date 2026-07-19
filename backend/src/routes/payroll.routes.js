const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const {
  setSalaryStructure, getSalaryStructure, generatePayslip, myPayslips, listPayslips
} = require('../controllers/payroll.controller');

router.use(authenticate);

router.get('/me', myPayslips);
router.get('/', requirePermission('MANAGE_PAYROLL'), listPayslips);
router.get('/salary-structure/:employeeId', getSalaryStructure);
router.put('/salary-structure/:employeeId', requirePermission('MANAGE_PAYROLL'), setSalaryStructure);
router.post('/generate/:employeeId', requirePermission('MANAGE_PAYROLL'), generatePayslip);

module.exports = router;