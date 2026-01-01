// src/routes/cases.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

/**
 * @swagger
 * components:
 *   schemas:
 *     Case:
 *       type: object
 *       properties:
 *         case_id:
 *           type: string
 *         case_number:
 *           type: string
 *         case_type:
 *           type: string
 *         province:
 *           type: string
 *         police_station:
 *           type: string
 *         case_date:
 *           type: string
 *           format: date-time
 *         sample_count:
 *           type: integer
 *         link_count:
 *           type: integer
 */

/**
 * @swagger
 * /cases:
 *   get:
 *     summary: รายการคดีทั้งหมด
 *     tags: [Cases]
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
 *         name: province
 *         schema:
 *           type: string
 *       - in: query
 *         name: case_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: รายการคดี
 */
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;
        
        let whereConditions = ['1=1'];
        const params = {};
        
        if (req.query.province) {
            whereConditions.push('c.province = @province');
            params.province = req.query.province;
        }
        
        if (req.query.case_type) {
            whereConditions.push('c.case_type = @case_type');
            params.case_type = req.query.case_type;
        }
        
        if (req.query.from_date) {
            whereConditions.push('c.case_date >= @from_date');
            params.from_date = req.query.from_date;
        }
        
        if (req.query.to_date) {
            whereConditions.push('c.case_date <= @to_date');
            params.to_date = req.query.to_date;
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM cases c WHERE ${whereClause}`,
            params
        );
        const total = countResult.recordset[0].total;
        
        // Get cases with sample and link counts
        const result = await query(`
            SELECT 
                c.case_id,
                c.case_number,
                c.case_type,
                c.case_category,
                c.province,
                c.police_station,
                c.case_date,
                c.analyst_name,
                (SELECT COUNT(*) FROM samples s WHERE s.case_id = c.case_id) as sample_count,
                (SELECT COUNT(*) FROM case_links cl WHERE cl.case1_id = c.case_id OR cl.case2_id = c.case_id) as link_count
            FROM cases c
            WHERE ${whereClause}
            ORDER BY c.case_date DESC
            OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
        `, params);
        
        res.json({
            data: result.recordset,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /cases/{id}:
 *   get:
 *     summary: รายละเอียดคดี
 *     tags: [Cases]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: รายละเอียดคดี
 *       404:
 *         description: ไม่พบคดี
 */
router.get('/:id', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT 
                c.*,
                (SELECT COUNT(*) FROM samples s WHERE s.case_id = c.case_id) as sample_count,
                (SELECT COUNT(*) FROM case_links cl WHERE cl.case1_id = c.case_id OR cl.case2_id = c.case_id) as link_count,
                (SELECT COUNT(*) FROM person_case_links pcl WHERE pcl.case_id = c.case_id) as person_count
            FROM cases c
            WHERE c.case_id = @id OR c.case_number = @id
        `, { id: req.params.id });
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: { message: 'Case not found', status: 404 } });
        }
        
        res.json({ data: result.recordset[0] });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /cases/{id}/samples:
 *   get:
 *     summary: รายการตัวอย่างในคดี
 *     tags: [Cases]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: รายการตัวอย่าง
 */
router.get('/:id/samples', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT s.*
            FROM samples s
            JOIN cases c ON s.case_id = c.case_id
            WHERE c.case_id = @id OR c.case_number = @id
            ORDER BY s.created_at
        `, { id: req.params.id });
        
        res.json({ data: result.recordset });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /cases/{id}/persons:
 *   get:
 *     summary: รายการบุคคลในคดี
 *     tags: [Cases]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: รายการบุคคล
 */
router.get('/:id/persons', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT 
                p.*,
                pcl.role,
                (SELECT COUNT(*) FROM person_case_links pcl2 WHERE pcl2.person_id = p.person_id) as total_cases
            FROM persons p
            JOIN person_case_links pcl ON p.person_id = pcl.person_id
            JOIN cases c ON pcl.case_id = c.case_id
            WHERE c.case_id = @id OR c.case_number = @id
        `, { id: req.params.id });
        
        res.json({ data: result.recordset });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /cases/{id}/links:
 *   get:
 *     summary: รายการ Links ของคดี
 *     tags: [Cases]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: รายการ Links
 */
router.get('/:id/links', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT 
                cl.*,
                c1.case_number as case1_number,
                c1.province as case1_province,
                c1.case_type as case1_type,
                c2.case_number as case2_number,
                c2.province as case2_province,
                c2.case_type as case2_type
            FROM case_links cl
            JOIN cases c1 ON cl.case1_id = c1.case_id
            JOIN cases c2 ON cl.case2_id = c2.case_id
            WHERE c1.case_id = @id OR c1.case_number = @id 
               OR c2.case_id = @id OR c2.case_number = @id
            ORDER BY cl.link_strength DESC
        `, { id: req.params.id });
        
        res.json({ data: result.recordset });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
