// src/routes/links.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

/**
 * @swagger
 * /links:
 *   get:
 *     summary: รายการ Links ทั้งหมด (เรียงตาม strength)
 *     tags: [Links]
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
 *         name: link_type
 *         schema:
 *           type: string
 *           enum: [DNA_MATCH, ID_NUMBER, EVIDENCE, NAME, PHONE]
 *       - in: query
 *         name: min_strength
 *         schema:
 *           type: number
 *           default: 0
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: รายการ Links
 */
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;
        const minStrength = parseFloat(req.query.min_strength) || 0;
        
        let whereConditions = ['cl.link_strength >= @min_strength'];
        const params = { min_strength: minStrength };
        
        if (req.query.link_type) {
            whereConditions.push('cl.link_type = @link_type');
            params.link_type = req.query.link_type;
        }
        
        if (req.query.province) {
            whereConditions.push('(c1.province = @province OR c2.province = @province)');
            params.province = req.query.province;
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        const countResult = await query(`
            SELECT COUNT(*) as total 
            FROM case_links cl
            JOIN cases c1 ON cl.case1_id = c1.case_id
            JOIN cases c2 ON cl.case2_id = c2.case_id
            WHERE ${whereClause}
        `, params);
        const total = countResult.recordset[0].total;
        
        const result = await query(`
            SELECT 
                cl.link_id,
                cl.link_type,
                cl.link_strength,
                cl.evidence_details,
                cl.verified,
                cl.created_at,
                c1.case_id as case1_id,
                c1.case_number as case1_number,
                c1.case_type as case1_type,
                c1.province as case1_province,
                c1.case_date as case1_date,
                c2.case_id as case2_id,
                c2.case_number as case2_number,
                c2.case_type as case2_type,
                c2.province as case2_province,
                c2.case_date as case2_date
            FROM case_links cl
            JOIN cases c1 ON cl.case1_id = c1.case_id
            JOIN cases c2 ON cl.case2_id = c2.case_id
            WHERE ${whereClause}
            ORDER BY cl.link_strength DESC, cl.created_at DESC
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
 * /links/types:
 *   get:
 *     summary: สรุปจำนวน Links แยกตามประเภท
 *     tags: [Links]
 *     responses:
 *       200:
 *         description: สรุปจำนวน Links
 */
router.get('/types', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT 
                link_type,
                COUNT(*) as count,
                AVG(link_strength) as avg_strength,
                SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified_count
            FROM case_links
            GROUP BY link_type
            ORDER BY count DESC
        `);
        
        res.json({ data: result.recordset });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /links/top:
 *   get:
 *     summary: Top Links (strength สูงสุด)
 *     tags: [Links]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Top Links
 */
router.get('/top', async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        
        const result = await query(`
            SELECT TOP (@limit)
                cl.link_id,
                cl.link_type,
                cl.link_strength,
                cl.evidence_details,
                c1.case_number as case1_number,
                c1.case_type as case1_type,
                c1.province as case1_province,
                c2.case_number as case2_number,
                c2.case_type as case2_type,
                c2.province as case2_province
            FROM case_links cl
            JOIN cases c1 ON cl.case1_id = c1.case_id
            JOIN cases c2 ON cl.case2_id = c2.case_id
            ORDER BY cl.link_strength DESC, cl.created_at DESC
        `, { limit });
        
        res.json({ data: result.recordset });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /links/{id}:
 *   get:
 *     summary: รายละเอียด Link
 *     tags: [Links]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: รายละเอียด Link
 */
router.get('/:id', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT 
                cl.*,
                c1.case_number as case1_number,
                c1.case_type as case1_type,
                c1.province as case1_province,
                c1.police_station as case1_station,
                c1.case_date as case1_date,
                c2.case_number as case2_number,
                c2.case_type as case2_type,
                c2.province as case2_province,
                c2.police_station as case2_station,
                c2.case_date as case2_date
            FROM case_links cl
            JOIN cases c1 ON cl.case1_id = c1.case_id
            JOIN cases c2 ON cl.case2_id = c2.case_id
            WHERE cl.link_id = @id
        `, { id: req.params.id });
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: { message: 'Link not found', status: 404 } });
        }
        
        res.json({ data: result.recordset[0] });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
