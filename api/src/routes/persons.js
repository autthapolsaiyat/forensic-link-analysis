// src/routes/persons.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

/**
 * @swagger
 * /persons:
 *   get:
 *     summary: รายการบุคคลทั้งหมด
 *     tags: [Persons]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: multi_case_only
 *         schema:
 *           type: boolean
 *         description: แสดงเฉพาะบุคคลที่ปรากฏหลายคดี
 *     responses:
 *       200:
 *         description: รายการบุคคล
 */
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;
        const multiCaseOnly = req.query.multi_case_only === 'true';
        
        const havingClause = multiCaseOnly ? 'HAVING COUNT(DISTINCT pcl.case_id) > 1' : '';
        
        const countResult = await query(`
            SELECT COUNT(*) as total FROM (
                SELECT p.person_id
                FROM persons p
                LEFT JOIN person_case_links pcl ON p.person_id = pcl.person_id
                GROUP BY p.person_id
                ${havingClause}
            ) t
        `);
        const total = countResult.recordset[0].total;
        
        const result = await query(`
            SELECT 
                p.person_id,
                p.id_number,
                p.full_name,
                p.first_name,
                p.last_name,
                p.gender,
                p.person_type,
                COUNT(DISTINCT pcl.case_id) as case_count
            FROM persons p
            LEFT JOIN person_case_links pcl ON p.person_id = pcl.person_id
            GROUP BY p.person_id, p.id_number, p.full_name, p.first_name, p.last_name, p.gender, p.person_type
            ${havingClause}
            ORDER BY case_count DESC, p.full_name
            OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
        `);
        
        res.json({
            data: result.recordset,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /persons/multi-case:
 *   get:
 *     summary: รายการบุคคลที่ปรากฏหลายคดี
 *     tags: [Persons]
 *     parameters:
 *       - in: query
 *         name: min_cases
 *         schema:
 *           type: integer
 *           default: 2
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: รายการบุคคลที่ปรากฏหลายคดี
 */
router.get('/multi-case', async (req, res, next) => {
    try {
        const minCases = parseInt(req.query.min_cases) || 2;
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        
        const result = await query(`
            SELECT 
                p.person_id,
                p.id_number,
                p.full_name,
                p.person_type,
                COUNT(DISTINCT pcl.case_id) as case_count,
                STRING_AGG(c.case_number, ', ') as case_numbers
            FROM persons p
            JOIN person_case_links pcl ON p.person_id = pcl.person_id
            JOIN cases c ON pcl.case_id = c.case_id
            GROUP BY p.person_id, p.id_number, p.full_name, p.person_type
            HAVING COUNT(DISTINCT pcl.case_id) >= @min_cases
            ORDER BY case_count DESC
            OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
        `, { min_cases: minCases, limit });
        
        res.json({ 
            data: result.recordset,
            total: result.recordset.length
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /persons/{id}:
 *   get:
 *     summary: รายละเอียดบุคคล
 *     tags: [Persons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: รายละเอียดบุคคล
 */
router.get('/:id', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT 
                p.*,
                (SELECT COUNT(*) FROM person_case_links pcl WHERE pcl.person_id = p.person_id) as case_count
            FROM persons p
            WHERE p.person_id = @id OR p.id_number = @id
        `, { id: req.params.id });
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: { message: 'Person not found', status: 404 } });
        }
        
        res.json({ data: result.recordset[0] });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /persons/{id}/cases:
 *   get:
 *     summary: รายการคดีของบุคคล
 *     tags: [Persons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: รายการคดี
 */
router.get('/:id/cases', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT 
                c.*,
                pcl.role,
                (SELECT COUNT(*) FROM samples s WHERE s.case_id = c.case_id) as sample_count
            FROM cases c
            JOIN person_case_links pcl ON c.case_id = pcl.case_id
            JOIN persons p ON pcl.person_id = p.person_id
            WHERE p.person_id = @id OR p.id_number = @id
            ORDER BY c.case_date DESC
        `, { id: req.params.id });
        
        res.json({ data: result.recordset });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
