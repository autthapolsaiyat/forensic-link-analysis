#!/bin/bash
# Auto Import ALL Years - No Interaction Required

echo "🚀 Forensic Link - Auto Import ALL Years"
echo "========================================="
echo "Started: $(date)"
echo ""

# Import each year
for year in 2024 2023 2022 2021 2020 2019 2018 2017 2016 2015 2014 2013 2012 2011 2010 2009 2008; do
    echo ""
    echo "═══════════════════════════════════════"
    echo "📅 Importing $year... ($(date))"
    echo "═══════════════════════════════════════"
    
    if [ "$year" == "2024" ]; then
        # 2024 - only Jan-Apr (May-Dec already imported)
        node batch_import.js "2024-01-01" "2024-04-30"
    else
        node batch_import.js "${year}-01-01" "${year}-12-31"
    fi
    
    echo "✅ $year completed!"
    sleep 5
done

# Generate Links
echo ""
echo "═══════════════════════════════════════"
echo "🔗 Generating DNA Links..."
echo "═══════════════════════════════════════"

sqlcmd -S sql-forensic-link-prod.database.windows.net -d forensic_link_db -U sqladmin -P 'F0r3ns1c@L1nk2025!' -Q "
;WITH UniqueCasePairs AS (
    SELECT DISTINCT
        CASE WHEN case1_id < case2_id THEN case1_id ELSE case2_id END as case_a,
        CASE WHEN case1_id < case2_id THEN case2_id ELSE case1_id END as case_b,
        MAX(CASE WHEN match_result = 'MATCH' THEN 1.0 ELSE 0.8 END) as strength
    FROM dna_matches WHERE case1_id != case2_id
    GROUP BY 
        CASE WHEN case1_id < case2_id THEN case1_id ELSE case2_id END,
        CASE WHEN case1_id < case2_id THEN case2_id ELSE case1_id END
)
INSERT INTO case_links (link_id, case1_id, case2_id, link_type, link_strength, evidence_details, verified, created_by)
SELECT 'LNK_DNA_' + CONVERT(VARCHAR(10), ABS(CHECKSUM(NEWID()))),
    case_a, case_b, 'DNA_MATCH', strength, N'DNA Match', 1, 'LINK_ENGINE'
FROM UniqueCasePairs ucp
WHERE NOT EXISTS (SELECT 1 FROM case_links cl WHERE cl.link_type = 'DNA_MATCH'
    AND ((cl.case1_id = ucp.case_a AND cl.case2_id = ucp.case_b)
      OR (cl.case1_id = ucp.case_b AND cl.case2_id = ucp.case_a)));
SELECT 'New links: ' + CAST(@@ROWCOUNT AS VARCHAR);
"

echo ""
echo "═══════════════════════════════════════"
echo "🎉 ALL IMPORTS COMPLETED!"
echo "Finished: $(date)"
echo "═══════════════════════════════════════"
