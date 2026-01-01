// src/routes/graph.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

/**
 * @swagger
 * /graph/person/{id}:
 *   get:
 *     summary: Graph data สำหรับ Person-Centric View
 *     tags: [Graph]
 */
router.get('/person/:id', async (req, res, next) => {
    try {
        // Get person info - ลบ date_of_birth, address, phone ออก
        const personResult = await query(`
            SELECT 
                p.person_id,
                p.id_number,
                p.full_name,
                p.first_name,
                p.last_name,
                p.gender,
                p.person_type,
                p.created_at,
                p.updated_at,
                COUNT(DISTINCT pcl.case_id) as case_count
            FROM persons p
            LEFT JOIN person_case_links pcl ON p.person_id = pcl.person_id
            WHERE p.person_id = @id OR p.id_number = @id
            GROUP BY p.person_id, p.id_number, p.full_name, p.first_name, p.last_name, 
                     p.gender, p.person_type, p.created_at, p.updated_at
        `, { id: req.params.id });
        
        if (personResult.recordset.length === 0) {
            return res.status(404).json({ error: { message: 'Person not found', status: 404 } });
        }
        
        const person = personResult.recordset[0];
        
        // Get cases for this person
        const casesResult = await query(`
            SELECT 
                c.case_id,
                c.case_number,
                c.case_type,
                c.case_category,
                c.province,
                c.police_station,
                c.case_date,
                pcl.role,
                CASE 
                    WHEN c.case_type LIKE N'%ฆ่า%' OR c.case_type LIKE N'%ปล้น%' OR c.case_type LIKE N'%ยาเสพติด%' 
                    THEN 'severe'
                    ELSE 'normal'
                END as severity,
                (SELECT COUNT(*) FROM samples s WHERE s.case_id = c.case_id) as sample_count
            FROM cases c
            JOIN person_case_links pcl ON c.case_id = pcl.case_id
            WHERE pcl.person_id = @person_id
            ORDER BY c.case_date DESC
        `, { person_id: person.person_id });
        
        // Build graph data
        const nodes = [
            {
                id: person.person_id,
                type: 'person',
                label: person.full_name,
                data: {
                    idNumber: person.id_number,
                    personType: person.person_type,
                    caseCount: person.case_count
                }
            },
            ...casesResult.recordset.map(c => ({
                id: c.case_id,
                type: 'case',
                label: c.case_number,
                data: {
                    title: c.case_type,
                    province: c.province,
                    station: c.police_station,
                    date: c.case_date,
                    role: c.role,
                    severity: c.severity,
                    sampleCount: c.sample_count
                }
            }))
        ];
        
        const edges = casesResult.recordset.map(c => ({
            source: person.person_id,
            target: c.case_id,
            type: 'PERSON_CASE',
            label: c.role,
            strength: 1.0
        }));
        
        res.json({
            data: {
                person,
                nodes,
                edges,
                stats: {
                    totalCases: casesResult.recordset.length,
                    severeCases: casesResult.recordset.filter(c => c.severity === 'severe').length,
                    normalCases: casesResult.recordset.filter(c => c.severity === 'normal').length
                }
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /graph/case/{id}:
 *   get:
 *     summary: Graph data สำหรับ Case-Centric View
 *     tags: [Graph]
 */
router.get('/case/:id', async (req, res, next) => {
    try {
        // Get case info
        const caseResult = await query(`
            SELECT c.*
            FROM cases c
            WHERE c.case_id = @id OR c.case_number = @id
        `, { id: req.params.id });
        
        if (caseResult.recordset.length === 0) {
            return res.status(404).json({ error: { message: 'Case not found', status: 404 } });
        }
        
        const mainCase = caseResult.recordset[0];
        
        // Get persons in this case
        const personsResult = await query(`
            SELECT 
                p.person_id,
                p.id_number,
                p.full_name,
                p.person_type,
                pcl.role,
                (SELECT COUNT(*) FROM person_case_links pcl2 WHERE pcl2.person_id = p.person_id) as total_cases
            FROM persons p
            JOIN person_case_links pcl ON p.person_id = pcl.person_id
            WHERE pcl.case_id = @case_id
        `, { case_id: mainCase.case_id });
        
        // Get linked cases
        const linksResult = await query(`
            SELECT 
                cl.link_id,
                cl.link_type,
                cl.link_strength,
                cl.evidence_details,
                CASE WHEN cl.case1_id = @case_id THEN c2.case_id ELSE c1.case_id END as linked_case_id,
                CASE WHEN cl.case1_id = @case_id THEN c2.case_number ELSE c1.case_number END as linked_case_number,
                CASE WHEN cl.case1_id = @case_id THEN c2.case_type ELSE c1.case_type END as linked_case_type,
                CASE WHEN cl.case1_id = @case_id THEN c2.province ELSE c1.province END as linked_province,
                CASE WHEN cl.case1_id = @case_id THEN c2.case_date ELSE c1.case_date END as linked_case_date
            FROM case_links cl
            JOIN cases c1 ON cl.case1_id = c1.case_id
            JOIN cases c2 ON cl.case2_id = c2.case_id
            WHERE cl.case1_id = @case_id OR cl.case2_id = @case_id
            ORDER BY cl.link_strength DESC
        `, { case_id: mainCase.case_id });
        
        // Build nodes
        const nodes = [
            {
                id: mainCase.case_id,
                type: 'case',
                label: mainCase.case_number,
                isCenter: true,
                data: {
                    title: mainCase.case_type,
                    province: mainCase.province,
                    station: mainCase.police_station,
                    date: mainCase.case_date,
                    severity: mainCase.case_type?.includes('ฆ่า') || mainCase.case_type?.includes('ปล้น') ? 'severe' : 'normal'
                }
            },
            ...personsResult.recordset.map(p => ({
                id: p.person_id,
                type: 'person',
                label: p.full_name,
                data: {
                    idNumber: p.id_number,
                    role: p.role,
                    totalCases: p.total_cases
                }
            })),
            ...linksResult.recordset.map(l => ({
                id: l.linked_case_id,
                type: 'case',
                label: l.linked_case_number,
                data: {
                    title: l.linked_case_type,
                    province: l.linked_province,
                    date: l.linked_case_date,
                    linkType: l.link_type,
                    linkStrength: l.link_strength,
                    severity: l.linked_case_type?.includes('ฆ่า') || l.linked_case_type?.includes('ปล้น') ? 'severe' : 'normal'
                }
            }))
        ];
        
        // Build edges
        const edges = [
            ...personsResult.recordset.map(p => ({
                source: mainCase.case_id,
                target: p.person_id,
                type: 'PERSON_CASE',
                label: p.role,
                strength: 1.0
            })),
            ...linksResult.recordset.map(l => ({
                source: mainCase.case_id,
                target: l.linked_case_id,
                type: l.link_type,
                label: l.link_type === 'DNA_MATCH' ? 'DNA ตรงกัน' : l.link_type,
                strength: l.link_strength
            }))
        ];
        
        res.json({
            data: {
                case: mainCase,
                nodes,
                edges,
                stats: {
                    personCount: personsResult.recordset.length,
                    linkCount: linksResult.recordset.length,
                    dnaLinks: linksResult.recordset.filter(l => l.link_type === 'DNA_MATCH').length,
                    idLinks: linksResult.recordset.filter(l => l.link_type === 'ID_NUMBER').length
                }
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /graph/network:
 *   get:
 *     summary: Network Graph
 *     tags: [Graph]
 */
router.get('/network', async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const minStrength = parseFloat(req.query.min_strength) || 0.8;
        
        const linksResult = await query(`
            SELECT TOP (@limit)
                cl.link_id,
                cl.link_type,
                cl.link_strength,
                c1.case_id as case1_id,
                c1.case_number as case1_number,
                c1.case_type as case1_type,
                c1.province as case1_province,
                c2.case_id as case2_id,
                c2.case_number as case2_number,
                c2.case_type as case2_type,
                c2.province as case2_province
            FROM case_links cl
            JOIN cases c1 ON cl.case1_id = c1.case_id
            JOIN cases c2 ON cl.case2_id = c2.case_id
            WHERE cl.link_strength >= @min_strength
            ORDER BY cl.link_strength DESC
        `, { limit, min_strength: minStrength });
        
        // Build unique nodes
        const nodeMap = new Map();
        linksResult.recordset.forEach(l => {
            if (!nodeMap.has(l.case1_id)) {
                nodeMap.set(l.case1_id, {
                    id: l.case1_id,
                    type: 'case',
                    label: l.case1_number,
                    data: {
                        title: l.case1_type,
                        province: l.case1_province,
                        severity: l.case1_type?.includes('ฆ่า') || l.case1_type?.includes('ปล้น') ? 'severe' : 'normal'
                    }
                });
            }
            if (!nodeMap.has(l.case2_id)) {
                nodeMap.set(l.case2_id, {
                    id: l.case2_id,
                    type: 'case',
                    label: l.case2_number,
                    data: {
                        title: l.case2_type,
                        province: l.case2_province,
                        severity: l.case2_type?.includes('ฆ่า') || l.case2_type?.includes('ปล้น') ? 'severe' : 'normal'
                    }
                });
            }
        });
        
        const nodes = Array.from(nodeMap.values());
        const edges = linksResult.recordset.map(l => ({
            source: l.case1_id,
            target: l.case2_id,
            type: l.link_type,
            strength: l.link_strength
        }));
        
        res.json({
            data: {
                nodes,
                edges,
                stats: {
                    nodeCount: nodes.length,
                    edgeCount: edges.length
                }
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
