// src/routes/search.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

/**
 * @swagger
 * /search:
 *   get:
 *     summary: ค้นหาทั่วไป (คดี, บุคคล, ตัวอย่าง)
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: คำค้นหา
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, cases, persons, samples]
 *           default: all
 *     responses:
 *       200:
 *         description: ผลการค้นหา
 */
router.get('/', async (req, res, next) => {
    try {
        const searchTerm = req.query.q;
        const searchType = req.query.type || 'all';
        
        if (!searchTerm || searchTerm.length < 2) {
            return res.status(400).json({ 
                error: { message: 'Search term must be at least 2 characters', status: 400 } 
            });
        }
        
        const results = {
            cases: [],
            persons: [],
            samples: []
        };
        
        // Search cases
        if (searchType === 'all' || searchType === 'cases') {
            const casesResult = await query(`
                SELECT TOP 20
                    case_id,
                    case_number,
                    case_type,
                    province,
                    police_station,
                    case_date
                FROM cases
                WHERE case_number LIKE @term
                   OR case_type LIKE @termWild
                   OR province LIKE @termWild
                   OR police_station LIKE @termWild
                ORDER BY case_date DESC
            `, { term: searchTerm, termWild: `%${searchTerm}%` });
            
            results.cases = casesResult.recordset;
        }
        
        // Search persons
        if (searchType === 'all' || searchType === 'persons') {
            const personsResult = await query(`
                SELECT TOP 20
                    p.person_id,
                    p.id_number,
                    p.full_name,
                    p.person_type,
                    (SELECT COUNT(*) FROM person_case_links pcl WHERE pcl.person_id = p.person_id) as case_count
                FROM persons p
                WHERE p.id_number LIKE @term
                   OR p.full_name LIKE @termWild
                   OR p.first_name LIKE @termWild
                   OR p.last_name LIKE @termWild
                ORDER BY case_count DESC
            `, { term: searchTerm, termWild: `%${searchTerm}%` });
            
            results.persons = personsResult.recordset;
        }
        
        // Search samples
        if (searchType === 'all' || searchType === 'samples') {
            const samplesResult = await query(`
                SELECT TOP 20
                    s.sample_id,
                    s.lab_number,
                    s.sample_type,
                    s.sample_source,
                    c.case_number,
                    c.province
                FROM samples s
                JOIN cases c ON s.case_id = c.case_id
                WHERE s.lab_number LIKE @term
                   OR s.sample_type LIKE @termWild
                   OR s.sample_source LIKE @termWild
                ORDER BY s.created_at DESC
            `, { term: searchTerm, termWild: `%${searchTerm}%` });
            
            results.samples = samplesResult.recordset;
        }
        
        res.json({
            data: results,
            query: searchTerm,
            counts: {
                cases: results.cases.length,
                persons: results.persons.length,
                samples: results.samples.length,
                total: results.cases.length + results.persons.length + results.samples.length
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /search/id/{idNumber}:
 *   get:
 *     summary: ค้นหาด้วยเลขประจำตัวประชาชน
 *     tags: [Search]
 *     parameters:
 *       - in: path
 *         name: idNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ผลการค้นหา
 */
router.get('/id/:idNumber', async (req, res, next) => {
    try {
        const idNumber = req.params.idNumber.replace(/\D/g, ''); // Remove non-digits
        
        // Find person
        const personResult = await query(`
            SELECT 
                p.*,
                (SELECT COUNT(*) FROM person_case_links pcl WHERE pcl.person_id = p.person_id) as case_count
            FROM persons p
            WHERE p.id_number = @id_number
        `, { id_number: idNumber });
        
        if (personResult.recordset.length === 0) {
            return res.json({
                data: {
                    person: null,
                    cases: [],
                    message: 'ไม่พบข้อมูลบุคคลในระบบ'
                }
            });
        }
        
        const person = personResult.recordset[0];
        
        // Get cases
        const casesResult = await query(`
            SELECT 
                c.*,
                pcl.role
            FROM cases c
            JOIN person_case_links pcl ON c.case_id = pcl.case_id
            WHERE pcl.person_id = @person_id
            ORDER BY c.case_date DESC
        `, { person_id: person.person_id });
        
        res.json({
            data: {
                person,
                cases: casesResult.recordset
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /search/case/{caseNumber}:
 *   get:
 *     summary: ค้นหาด้วยเลขคดี
 *     tags: [Search]
 *     parameters:
 *       - in: path
 *         name: caseNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ผลการค้นหา
 */
router.get('/case/:caseNumber', async (req, res, next) => {
    try {
        const caseNumber = req.params.caseNumber;
        
        // Find case
        const caseResult = await query(`
            SELECT c.*
            FROM cases c
            WHERE c.case_number = @case_number
        `, { case_number: caseNumber });
        
        if (caseResult.recordset.length === 0) {
            // Try partial match
            const partialResult = await query(`
                SELECT TOP 10 c.*
                FROM cases c
                WHERE c.case_number LIKE @term
                ORDER BY c.case_date DESC
            `, { term: `%${caseNumber}%` });
            
            return res.json({
                data: {
                    exactMatch: null,
                    partialMatches: partialResult.recordset
                }
            });
        }
        
        const caseData = caseResult.recordset[0];
        
        // Get samples
        const samplesResult = await query(`
            SELECT * FROM samples WHERE case_id = @case_id
        `, { case_id: caseData.case_id });
        
        // Get persons
        const personsResult = await query(`
            SELECT p.*, pcl.role
            FROM persons p
            JOIN person_case_links pcl ON p.person_id = pcl.person_id
            WHERE pcl.case_id = @case_id
        `, { case_id: caseData.case_id });
        
        // Get links
        const linksResult = await query(`
            SELECT 
                cl.*,
                CASE WHEN cl.case1_id = @case_id THEN c2.case_number ELSE c1.case_number END as linked_case
            FROM case_links cl
            JOIN cases c1 ON cl.case1_id = c1.case_id
            JOIN cases c2 ON cl.case2_id = c2.case_id
            WHERE cl.case1_id = @case_id OR cl.case2_id = @case_id
        `, { case_id: caseData.case_id });
        
        res.json({
            data: {
                case: caseData,
                samples: samplesResult.recordset,
                persons: personsResult.recordset,
                links: linksResult.recordset
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /search/advanced:
 *   post:
 *     summary: ค้นหาขั้นสูง
 *     tags: [Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               province:
 *                 type: string
 *               case_type:
 *                 type: string
 *               from_date:
 *                 type: string
 *                 format: date
 *               to_date:
 *                 type: string
 *                 format: date
 *               has_links:
 *                 type: boolean
 *               min_link_strength:
 *                 type: number
 *     responses:
 *       200:
 *         description: ผลการค้นหา
 */
router.post('/advanced', async (req, res, next) => {
    try {
        const { province, case_type, from_date, to_date, has_links, min_link_strength } = req.body;
        
        let whereConditions = ['1=1'];
        const params = {};
        
        if (province) {
            whereConditions.push('c.province = @province');
            params.province = province;
        }
        
        if (case_type) {
            whereConditions.push('c.case_type LIKE @case_type');
            params.case_type = `%${case_type}%`;
        }
        
        if (from_date) {
            whereConditions.push('c.case_date >= @from_date');
            params.from_date = from_date;
        }
        
        if (to_date) {
            whereConditions.push('c.case_date <= @to_date');
            params.to_date = to_date;
        }
        
        if (has_links) {
            whereConditions.push(`EXISTS (
                SELECT 1 FROM case_links cl 
                WHERE (cl.case1_id = c.case_id OR cl.case2_id = c.case_id)
                ${min_link_strength ? 'AND cl.link_strength >= @min_strength' : ''}
            )`);
            if (min_link_strength) {
                params.min_strength = min_link_strength;
            }
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        const result = await query(`
            SELECT TOP 100
                c.*,
                (SELECT COUNT(*) FROM samples s WHERE s.case_id = c.case_id) as sample_count,
                (SELECT COUNT(*) FROM case_links cl WHERE cl.case1_id = c.case_id OR cl.case2_id = c.case_id) as link_count
            FROM cases c
            WHERE ${whereClause}
            ORDER BY c.case_date DESC
        `, params);
        
        res.json({
            data: result.recordset,
            count: result.recordset.length,
            filters: { province, case_type, from_date, to_date, has_links, min_link_strength }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
