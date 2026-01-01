// src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

// Import routes
const caseRoutes = require('./routes/cases');
const sampleRoutes = require('./routes/samples');
const personRoutes = require('./routes/persons');
const linkRoutes = require('./routes/links');
const graphRoutes = require('./routes/graph');
const statsRoutes = require('./routes/stats');
const searchRoutes = require('./routes/search');

const app = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Forensic Link Analysis API',
            version: '1.0.0',
            description: 'API สำหรับระบบเชื่อมโยงข้อมูลนิติวิทยาศาสตร์ ศพฐ.10',
        },
        servers: [
            { url: `http://localhost:${PORT}${API_PREFIX}`, description: 'Development' },
            { url: `https://forensic-link-api.azurewebsites.net${API_PREFIX}`, description: 'Production' }
        ]
    },
    apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// CORS - Allow all origins for now
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight
app.options('*', cors());

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(morgan('dev'));
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use(`${API_PREFIX}/cases`, caseRoutes);
app.use(`${API_PREFIX}/samples`, sampleRoutes);
app.use(`${API_PREFIX}/persons`, personRoutes);
app.use(`${API_PREFIX}/links`, linkRoutes);
app.use(`${API_PREFIX}/graph`, graphRoutes);
app.use(`${API_PREFIX}/stats`, statsRoutes);
app.use(`${API_PREFIX}/search`, searchRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
            status: err.status || 500
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: { message: 'Not Found', status: 404 } });
});

// Start server
app.listen(PORT, () => {
    console.log(`
🚀 Forensic Link Analysis API
================================
📍 Server:  http://localhost:${PORT}
📚 Docs:    http://localhost:${PORT}/api-docs
🔗 API:     http://localhost:${PORT}${API_PREFIX}
================================
    `);
});

module.exports = app;
