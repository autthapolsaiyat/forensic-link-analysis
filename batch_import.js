#!/usr/bin/env node
// =====================================================
// FORENSIC LINK ANALYSIS SYSTEM
// Batch Import Script - NDDB to Azure SQL
// =====================================================

const https = require('http');
const sql = require('mssql');

// =====================================================
// CONFIGURATION
// =====================================================
const CONFIG = {
  nddb: {
    host: 'nddb',
    port: 809,
    site: 'RTP10'
  },
  sql: {
    server: 'sql-forensic-link-prod.database.windows.net',
    database: 'forensic_link_db',
    user: 'sqladmin',
    password: 'F0r3ns1c@L1nk2025!',
    options: {
      encrypt: true,
      trustServerCertificate: false
    }
  },
  batch: {
    size: 50,           // Cases per batch
    delayMs: 500,       // Delay between API calls
    maxRetries: 3
  }
};

// =====================================================
// NDDB API CLIENT
// =====================================================
async function fetchFromNDDB(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `http://${CONFIG.nddb.host}:${CONFIG.nddb.port}${endpoint}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function getCaseList(fromDate, toDate) {
  const endpoint = `/webservice.asmx/getCaseListFromDate?site=${CONFIG.nddb.site}&fromDate=${fromDate}&toDate=${toDate}`;
  return fetchFromNDDB(endpoint);
}

async function getCaseDetails(caseNumber) {
  const endpoint = `/webservice.asmx/getImportCase?site=${CONFIG.nddb.site}&CaseNumber=${encodeURIComponent(caseNumber)}`;
  return fetchFromNDDB(endpoint);
}

async function getCaseMatch(caseNumber) {
  const endpoint = `/webservice.asmx/getCaseMatch?site=${CONFIG.nddb.site}&caseNumber=${encodeURIComponent(caseNumber)}`;
  return fetchFromNDDB(endpoint);
}

// =====================================================
// DATABASE OPERATIONS
// =====================================================
async function insertCase(pool, caseData) {
  const caseId = `PFSC10_${caseData.CaseNumber}`;
  
  try {
    await pool.request()
      .input('case_id', sql.VarChar(50), caseId)
      .input('case_number', sql.VarChar(50), caseData.CaseNumber)
      .input('center_id', sql.VarChar(10), 'RTP10')
      .input('site', sql.VarChar(20), caseData.Site || 'PFSC10')
      .input('type_of_registry', sql.VarChar(100), caseData.TypeOfRegistry)
      .input('sample_source_group', sql.VarChar(50), caseData.SampleSourceGroup)
      .input('received_number', sql.VarChar(50), caseData.ReceivedNumber)
      .input('received_date', sql.Date, caseData.ReceivedDate ? new Date(caseData.ReceivedDate) : null)
      .input('document_number', sql.VarChar(100), caseData.DocumentNumber)
      .input('document_date', sql.Date, caseData.DocumentDate ? new Date(caseData.DocumentDate) : null)
      .input('analyst_name', sql.NVarChar(200), caseData.AnalystName)
      .input('case_date', sql.DateTime2, caseData.CaseDate ? new Date(caseData.CaseDate) : null)
      .input('scene_address', sql.NVarChar(sql.MAX), caseData.SceneAddress)
      .input('comments', sql.NVarChar(sql.MAX), caseData.Comments)
      .input('accuser_name', sql.NVarChar(200), caseData.AccuserName)
      .input('accused_name', sql.NVarChar(200), caseData.AccusedName)
      .input('suspect_given_name', sql.NVarChar(200), caseData.SuspectGivenName)
      .input('victim_given_name', sql.NVarChar(200), caseData.VictimGivenName)
      .input('province', sql.NVarChar(100), caseData.Province ? caseData.Province.split('-')[0] : null)
      .input('police_station', sql.NVarChar(100), caseData.PoliceStation)
      .input('case_category', sql.NVarChar(100), caseData.CaseCategory)
      .input('case_type', sql.NVarChar(100), caseData.CaseType)
      .input('agent_name', sql.NVarChar(200), caseData.Agent)
      .input('agent_tel', sql.VarChar(50), caseData.AgentTel)
      .input('sender_name', sql.NVarChar(200), caseData.Sender)
      .input('case_closed', sql.Bit, caseData.CaseClosed === 'True' ? 1 : 0)
      .input('case_closed_date', sql.DateTime2, caseData.CaseClosedDate ? new Date(caseData.CaseClosedDate) : null)
      .query(`
        MERGE INTO cases AS target
        USING (SELECT @case_id as case_id) AS source
        ON target.case_id = source.case_id
        WHEN MATCHED THEN
          UPDATE SET 
            type_of_registry = @type_of_registry,
            sample_source_group = @sample_source_group,
            analyst_name = @analyst_name,
            case_date = @case_date,
            province = @province,
            case_category = @case_category,
            case_type = @case_type,
            case_closed = @case_closed,
            updated_at = GETUTCDATE(),
            sync_status = 'synced',
            last_sync_at = GETUTCDATE()
        WHEN NOT MATCHED THEN
          INSERT (case_id, case_number, center_id, site, type_of_registry, sample_source_group,
                  received_number, received_date, document_number, document_date,
                  analyst_name, case_date, scene_address, comments,
                  accuser_name, accused_name, suspect_given_name, victim_given_name,
                  province, police_station, case_category, case_type,
                  agent_name, agent_tel, sender_name, case_closed, case_closed_date,
                  sync_status, last_sync_at)
          VALUES (@case_id, @case_number, @center_id, @site, @type_of_registry, @sample_source_group,
                  @received_number, @received_date, @document_number, @document_date,
                  @analyst_name, @case_date, @scene_address, @comments,
                  @accuser_name, @accused_name, @suspect_given_name, @victim_given_name,
                  @province, @police_station, @case_category, @case_type,
                  @agent_name, @agent_tel, @sender_name, @case_closed, @case_closed_date,
                  'synced', GETUTCDATE());
      `);
    
    return caseId;
  } catch (err) {
    if (err.number === 2627) { // Duplicate key
      return caseId;
    }
    throw err;
  }
}

async function insertSample(pool, caseId, sample) {
  const sampleId = `PFSC10_${sample.ClientSampleNumber}`;
  
  try {
    await pool.request()
      .input('sample_id', sql.VarChar(50), sampleId)
      .input('lab_number', sql.VarChar(50), sample.ClientSampleNumber)
      .input('case_id', sql.VarChar(50), caseId)
      .input('center_id', sql.VarChar(10), 'RTP10')
      .input('sample_type', sql.VarChar(50), sample.SampleType)
      .input('sample_source', sql.NVarChar(200), sample.SampleSource)
      .input('sample_description', sql.NVarChar(sql.MAX), sample.SampleDescription)
      .input('status', sql.VarChar(20), 'completed')
      .query(`
        MERGE INTO samples AS target
        USING (SELECT @sample_id as sample_id) AS source
        ON target.sample_id = source.sample_id
        WHEN MATCHED THEN
          UPDATE SET 
            sample_type = @sample_type,
            sample_source = @sample_source,
            sample_description = @sample_description,
            updated_at = GETUTCDATE()
        WHEN NOT MATCHED THEN
          INSERT (sample_id, lab_number, case_id, center_id, sample_type, sample_source, sample_description, status)
          VALUES (@sample_id, @lab_number, @case_id, @center_id, @sample_type, @sample_source, @sample_description, @status);
      `);
    
    // Insert person if has ID number
    if (sample.IDNumber && sample.IDNumber.trim() && sample.IDNumber.length >= 10) {
      const cleanId = sample.IDNumber.replace(/\s/g, '');
      await insertPerson(pool, caseId, {
        idNumber: cleanId,
        firstName: sample.GivenName,
        lastName: sample.FamilyName,
        gender: sample.Gender,
        role: sample.SampleSource
      });
    }
    
    return sampleId;
  } catch (err) {
    if (err.number === 2627) return sampleId;
    throw err;
  }
}

async function insertPerson(pool, caseId, personData) {
  const personId = `PER_${personData.idNumber}`;
  const fullName = [personData.firstName, personData.lastName].filter(Boolean).join(' ');
  
  try {
    // Insert or update person
    await pool.request()
      .input('person_id', sql.VarChar(50), personId)
      .input('id_number', sql.VarChar(20), personData.idNumber)
      .input('first_name', sql.NVarChar(100), personData.firstName)
      .input('last_name', sql.NVarChar(100), personData.lastName)
      .input('full_name', sql.NVarChar(200), fullName)
      .input('gender', sql.NVarChar(10), personData.gender)
      .input('person_type', sql.VarChar(50), personData.role)
      .query(`
        MERGE INTO persons AS target
        USING (SELECT @person_id as person_id) AS source
        ON target.person_id = source.person_id
        WHEN NOT MATCHED THEN
          INSERT (person_id, id_number, first_name, last_name, full_name, gender, person_type)
          VALUES (@person_id, @id_number, @first_name, @last_name, @full_name, @gender, @person_type);
      `);
    
    // Link person to case
    await pool.request()
      .input('person_id', sql.VarChar(50), personId)
      .input('case_id', sql.VarChar(50), caseId)
      .input('role', sql.VarChar(50), personData.role || 'Unknown')
      .query(`
        IF NOT EXISTS (SELECT 1 FROM person_case_links WHERE person_id = @person_id AND case_id = @case_id)
          INSERT INTO person_case_links (person_id, case_id, role) VALUES (@person_id, @case_id, @role);
      `);
    
    return personId;
  } catch (err) {
    // Ignore duplicate errors
    return personId;
  }
}

async function insertDNAMatch(pool, matchData) {
  if (!matchData.MatchedCase || matchData.MatchedCase === matchData.SourceCase) {
    return null; // Skip non-cross-case matches
  }
  
  const matchId = `MATCH_${matchData.ParentNo}_${matchData.MatchParentNo || 'unknown'}`;
  const case1Id = `PFSC10_${matchData.SourceCase}`;
  const case2Id = `PFSC10_${matchData.MatchedCase}`;
  const sample1Id = `PFSC10_${matchData.ParentNo}`;
  const sample2Id = matchData.MatchParentNo ? `PFSC10_${matchData.MatchParentNo}` : null;
  
  try {
    await pool.request()
      .input('match_id', sql.VarChar(100), matchId)
      .input('sample1_id', sql.VarChar(50), sample1Id)
      .input('sample2_id', sql.VarChar(50), sample2Id)
      .input('case1_id', sql.VarChar(50), case1Id)
      .input('case2_id', sql.VarChar(50), case2Id)
      .input('match_result', sql.VarChar(20), matchData.MatchResult === 'Full' ? 'MATCH' : 'PARTIAL')
      .input('match_score', sql.Decimal(5,4), matchData.MatchResult === 'Full' ? 1.0 : 0.8)
      .input('source_system', sql.VarChar(50), 'NDDB')
      .query(`
        IF NOT EXISTS (SELECT 1 FROM dna_matches WHERE match_id = @match_id)
          INSERT INTO dna_matches (match_id, sample1_id, sample2_id, case1_id, case2_id, match_result, match_score, source_system, verified)
          VALUES (@match_id, @sample1_id, @sample2_id, @case1_id, @case2_id, @match_result, @match_score, @source_system, 1);
      `);
    
    return matchId;
  } catch (err) {
    // Ignore foreign key errors (missing samples)
    return null;
  }
}

// =====================================================
// MAIN IMPORT FUNCTION
// =====================================================
async function runImport(fromDate, toDate) {
  console.log('🚀 Starting Batch Import');
  console.log(`📅 Date Range: ${fromDate} to ${toDate}`);
  console.log('');
  
  const stats = {
    casesProcessed: 0,
    casesCreated: 0,
    samplesCreated: 0,
    personsCreated: 0,
    matchesCreated: 0,
    errors: []
  };
  
  let pool;
  
  try {
    // Connect to database
    console.log('🔌 Connecting to Azure SQL...');
    pool = await sql.connect(CONFIG.sql);
    console.log('✅ Connected!\n');
    
    // Get case list
    console.log('📋 Fetching case list from NDDB...');
    const caseList = await getCaseList(fromDate, toDate);
    console.log(`✅ Found ${caseList.length} cases\n`);
    
    // Process cases in batches
    const totalBatches = Math.ceil(caseList.length / CONFIG.batch.size);
    
    for (let i = 0; i < caseList.length; i += CONFIG.batch.size) {
      const batch = caseList.slice(i, i + CONFIG.batch.size);
      const batchNum = Math.floor(i / CONFIG.batch.size) + 1;
      
      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} cases)...`);
      
      for (const caseItem of batch) {
        try {
          // Get case details
          const caseData = await getCaseDetails(caseItem.CaseNumber);
          
          if (!caseData || !caseData.CaseNumber) {
            stats.errors.push(`Empty response for ${caseItem.CaseNumber}`);
            continue;
          }
          
          // Insert case
          const caseId = await insertCase(pool, caseData);
          stats.casesCreated++;
          
          // Insert samples
          if (caseData.Samples && Array.isArray(caseData.Samples)) {
            for (const sample of caseData.Samples) {
              await insertSample(pool, caseId, sample);
              stats.samplesCreated++;
            }
          }
          
          // Get and insert DNA matches
          try {
            const matches = await getCaseMatch(caseItem.CaseNumber);
            if (Array.isArray(matches)) {
              for (const match of matches) {
                if (match.MatchedCase) {
                  const matchId = await insertDNAMatch(pool, match);
                  if (matchId) stats.matchesCreated++;
                }
              }
            }
          } catch (matchErr) {
            // Ignore match errors
          }
          
          stats.casesProcessed++;
          
          // Delay to avoid overwhelming API
          await new Promise(r => setTimeout(r, CONFIG.batch.delayMs));
          
        } catch (err) {
          stats.errors.push(`${caseItem.CaseNumber}: ${err.message}`);
        }
      }
      
      // Progress update
      const progress = Math.round((stats.casesProcessed / caseList.length) * 100);
      console.log(`   ✅ Batch ${batchNum} complete | Progress: ${progress}% | Cases: ${stats.casesProcessed}/${caseList.length}`);
    }
    
    // Run Link Engine
    console.log('\n🔗 Running Link Engine...');
    await pool.request().query('EXEC sp_batch_process_links');
    console.log('✅ Link Engine complete!\n');
    
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    stats.errors.push(`Fatal: ${err.message}`);
  } finally {
    if (pool) await pool.close();
  }
  
  // Print summary
  console.log('═══════════════════════════════════════');
  console.log('📊 IMPORT SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`Cases Processed:  ${stats.casesProcessed}`);
  console.log(`Cases Created:    ${stats.casesCreated}`);
  console.log(`Samples Created:  ${stats.samplesCreated}`);
  console.log(`Matches Created:  ${stats.matchesCreated}`);
  console.log(`Errors:           ${stats.errors.length}`);
  console.log('═══════════════════════════════════════');
  
  if (stats.errors.length > 0 && stats.errors.length <= 10) {
    console.log('\n⚠️ Errors:');
    stats.errors.forEach(e => console.log(`   - ${e}`));
  }
  
  return stats;
}

// =====================================================
// CLI
// =====================================================
const args = process.argv.slice(2);
const fromDate = args[0] || '2024-12-01';
const toDate = args[1] || '2024-12-31';

runImport(fromDate, toDate)
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
