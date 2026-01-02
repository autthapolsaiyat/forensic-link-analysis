// src/routes/stats.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

/**
 * @swagger
 * /stats/overview:
 *   get:
 *     summary: สถิติภาพรวมระบบ
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: สถิติภาพรวม
 */
router.get('/overview', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT
                (SELECT COUNT(*) FROM cases) as total_cases,
                (SELECT COUNT(*) FROM samples) as total_samples,
                (SELECT COUNT(*) FROM persons) as total_persons,
                (SELECT COUNT(*) FROM dna_matches) as total_dna_matches,
                (SELECT COUNT(*) FROM case_links) as total_links,
                (SELECT COUNT(*) FROM (
                    SELECT person_id FROM person_case_links 
                    GROUP BY person_id HAVING COUNT(*) > 1
                ) t) as multi_case_persons,
                (SELECT COUNT(*) FROM case_links WHERE link_type = 'DNA_MATCH') as dna_links,
                (SELECT COUNT(*) FROM case_links WHERE link_type = 'ID_NUMBER') as id_links,
                (SELECT COUNT(*) FROM case_links WHERE verified = 1) as verified_links
        `);
        
        res.json({ data: result.recordset[0] });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /stats/by-year:
 *   get:
 *     summary: สถิติแยกตามปี (สำหรับ Live Import Monitor)
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: สถิติแยกตามปี
 */
router.get('/by-year', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT 
                YEAR(case_date) as year,
                COUNT(*) as count
            FROM cases
            WHERE case_date IS NOT NULL
            GROUP BY YEAR(case_date)
            ORDER BY year DESC
        `);
        
        res.json({ data: result.recordset });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /stats/by-province:
 *   get:
 *     summary: สถิติแยกตามจังหวัด
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: สถิติแยกตามจังหวัด
 */
router.get('/by-province', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT 
                c.province,
                COUNT(*) as case_count,
                (SELECT COUNT(*) FROM samples s WHERE s.case_id IN (SELECT case_id FROM cases WHERE province = c.province)) as sample_count,
                (SELECT COUNT(*) FROM case_links cl 
                 JOIN cases c1 ON cl.case1_id = c1.case_id 
                 WHERE c1.province = c.province) as link_count
            FROM cases c
            WHERE c.province IS NOT NULL AND c.province != ''
            GROUP BY c.province
            ORDER BY case_count DESC
        `);
        
        res.json({ data: result.recordset });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /stats/by-case-type:
 *   get:
 *     summary: สถิติแยกตามประเภทคดี
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: สถิติแยกตามประเภทคดี
 */
router.get('/by-case-type', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT TOP 20
                case_type,
                COUNT(*) as count
            FROM cases
            WHERE case_type IS NOT NULL AND case_type != ''
            GROUP BY case_type
            ORDER BY count DESC
        `);
        
        res.json({ data: result.recordset });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /stats/by-month:
 *   get:
 *     summary: สถิติแยกตามเดือน
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: สถิติแยกตามเดือน
 */
router.get('/by-month', async (req, res, next) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        
        const result = await query(`
            SELECT 
                YEAR(case_date) as year,
                MONTH(case_date) as month,
                COUNT(*) as case_count,
                (SELECT COUNT(*) FROM samples s 
                 WHERE s.case_id IN (
                     SELECT case_id FROM cases 
                     WHERE YEAR(case_date) = YEAR(c.case_date) 
                     AND MONTH(case_date) = MONTH(c.case_date)
                 )) as sample_count
            FROM cases c
            WHERE case_date IS NOT NULL 
            AND YEAR(case_date) = @year
            GROUP BY YEAR(case_date), MONTH(case_date)
            ORDER BY year, month
        `, { year });
        
        res.json({ data: result.recordset });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /stats/links-summary:
 *   get:
 *     summary: สรุป Links ทั้งหมด
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: สรุป Links
 */
router.get('/links-summary', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT 
                link_type,
                COUNT(*) as count,
                AVG(link_strength) as avg_strength,
                MIN(link_strength) as min_strength,
                MAX(link_strength) as max_strength,
                SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified_count
            FROM case_links
            GROUP BY link_type
            ORDER BY count DESC
        `);
        
        // Get cross-province links
        const crossProvinceResult = await query(`
            SELECT COUNT(*) as cross_province_links
            FROM case_links cl
            JOIN cases c1 ON cl.case1_id = c1.case_id
            JOIN cases c2 ON cl.case2_id = c2.case_id
            WHERE c1.province != c2.province
        `);
        
        res.json({ 
            data: {
                byType: result.recordset,
                crossProvinceLinks: crossProvinceResult.recordset[0].cross_province_links
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /stats/top-linked-cases:
 *   get:
 *     summary: คดีที่มี Links มากที่สุด
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Top linked cases
 */
router.get('/top-linked-cases', async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        
        const result = await query(`
            SELECT TOP (@limit)
                c.case_id,
                c.case_number,
                c.case_type,
                c.province,
                c.case_date,
                COUNT(DISTINCT cl.link_id) as link_count,
                (SELECT COUNT(*) FROM samples s WHERE s.case_id = c.case_id) as sample_count
            FROM cases c
            JOIN case_links cl ON c.case_id = cl.case1_id OR c.case_id = cl.case2_id
            GROUP BY c.case_id, c.case_number, c.case_type, c.province, c.case_date
            ORDER BY link_count DESC
        `, { limit });
        
        res.json({ data: result.recordset });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
