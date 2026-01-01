// src/routes/samples.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

/**
 * @swagger
 * /samples:
 *   get:
 *     summary: รายการตัวอย่างทั้งหมด
 *     tags: [Samples]
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
 *         name: sample_type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: รายการตัวอย่าง
 */
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;
        
        let whereConditions = ['1=1'];
        const params = {};
        
        if (req.query.sample_type) {
            whereConditions.push('s.sample_type = @sample_type');
            params.sample_type = req.query.sample_type;
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        const countResult = await query(
            `SELECT COUNT(*) as total FROM samples s WHERE ${whereClause}`,
            params
        );
        const total = countResult.recordset[0].total;
        
        const result = await query(`
            SELECT 
                s.*,
                c.case_number,
                c.province
            FROM samples s
            JOIN cases c ON s.case_id = c.case_id
            WHERE ${whereClause}
            ORDER BY s.created_at DESC
            OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
        `, params);
        
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
 * /samples/{id}:
 *   get:
 *     summary: รายละเอียดตัวอย่าง
 *     tags: [Samples]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: รายละเอียดตัวอย่าง
 */
router.get('/:id', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT 
                s.*,
                c.case_number,
                c.case_type,
                c.province,
                c.police_station
            FROM samples s
            JOIN cases c ON s.case_id = c.case_id
            WHERE s.sample_id = @id OR s.lab_number = @id
        `, { id: req.params.id });
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: { message: 'Sample not found', status: 404 } });
        }
        
        res.json({ data: result.recordset[0] });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /samples/{id}/matches:
 *   get:
 *     summary: รายการ DNA Match ของตัวอย่าง
 *     tags: [Samples]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: รายการ DNA Match
 */
router.get('/:id/matches', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT 
                dm.*,
                c1.case_number as case1_number,
                c2.case_number as case2_number
            FROM dna_matches dm
            LEFT JOIN cases c1 ON dm.case1_id = c1.case_id
            LEFT JOIN cases c2 ON dm.case2_id = c2.case_id
            WHERE dm.sample1_id = @id OR dm.sample2_id = @id
            ORDER BY dm.match_score DESC
        `, { id: req.params.id });
        
        res.json({ data: result.recordset });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
