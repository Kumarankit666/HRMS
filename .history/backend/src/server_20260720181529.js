require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// --- Security & parsing middleware ------------------------------------------------------
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic rate limiting on auth endpoints to slow down brute-force attempts.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth', authLimiter);

// --- Health check -------------------------------------------------------------------------
app.get('/api/health', (req, res) => res.json({ success: true, message: 'HRMS API is running.' }));

// --- Static files (generated PDFs) ---------------------------------------------------------
app.use('/files/offer-letters', express.static(require('path').join(__dirname, '..', 'storage', 'offer-letters')));
app.use('/files/payslips', express.static(require('path').join(__dirname, '..', 'storage', 'payslips')));
app.use('/files/documents', express.static(require('path').join(__dirname, '..', 'storage', 'documents')));
app.use('/files/certificates', express.static(require('path').join(__dirname, '..', 'storage', 'certificates')));
app.use('/files/policies', express.static(require('path').join(__dirname, '..', 'storage', 'policies')));
app.use('/files/faculty', express.static(require('path').join(__dirname, '..', 'storage', 'faculty')));

// --- Routes ---------------------------------------------------------------------------------
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/employees', require('./routes/employee.routes'));
app.use('/api/onboarding', require('./routes/onboarding.routes'));
app.use('/api/leave', require('./routes/leave.routes'));
app.use('/api/offer-letters', require('./routes/offerLetter.routes'));
app.use('/api/reference', require('./routes/reference.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/payroll', require('./routes/payroll.routes'));
app.use('/api/documents', require('./routes/document.routes'));
app.use('/api/careers', require('./routes/careers.routes'));
app.use('/api/training', require('./routes/training.routes'));
app.use('/api/training-admin', require('./routes/trainingAdmin.routes'));
app.use('/api/consent', require('./routes/consent.routes'));
app.use('/api/policies-admin', require('./routes/policyAdmin.routes'));
app.use('/api/faculty', require('./routes/faculty.routes'));
app.use('/api/faculty-admin', require('./routes/facultyAdmin.routes'));

// --- 404 + error handling -------------------------------------------------------------------
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`HRMS API listening on http://localhost:${PORT}`));

module.exports = app;