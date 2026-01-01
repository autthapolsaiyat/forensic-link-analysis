#!/bin/bash
# Full Import Script - All Years

echo "🚀 Forensic Link - Full Import"
echo "=============================="

# Function to import and generate links
import_year() {
    year=$1
    echo ""
    echo "📅 Importing $year..."
    node batch_import.js "${year}-01-01" "${year}-12-31"
    echo "✅ $year done!"
}

# Show menu
echo ""
echo "Select option:"
echo "1) Import 2024 remaining (Jan-Apr)"
echo "2) Import 2023"
echo "3) Import 2022"
echo "4) Import 2021"
echo "5) Import 2020"
echo "6) Import 2019"
echo "7) Import 2018"
echo "8) Import 2017"
echo "9) Import 2016"
echo "10) Import 2015"
echo "11) Import 2014"
echo "12) Import 2013"
echo "13) Import 2008-2012"
echo "14) Import ALL (2008-2024) ⚠️ ~70 ชม."
echo "15) Generate Links only"
echo ""
read -p "Enter choice [1-15]: " choice

case $choice in
    1) node batch_import.js "2024-01-01" "2024-04-30" ;;
    2) import_year 2023 ;;
    3) import_year 2022 ;;
    4) import_year 2021 ;;
    5) import_year 2020 ;;
    6) import_year 2019 ;;
    7) import_year 2018 ;;
    8) import_year 2017 ;;
    9) import_year 2016 ;;
    10) import_year 2015 ;;
    11) import_year 2014 ;;
    12) import_year 2013 ;;
    13) 
        for y in 2008 2009 2010 2011 2012; do
            import_year $y
        done
        ;;
    14)
        echo "⚠️ This will take ~70 hours!"
        read -p "Continue? [y/N]: " confirm
        if [[ $confirm == "y" ]]; then
            for y in $(seq 2008 2024); do
                import_year $y
            done
        fi
        ;;
    15)
        echo "🔗 Generating links..."
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
        SELECT 'Links created: ' + CAST(@@ROWCOUNT AS VARCHAR);
        "
        ;;
    *) echo "Invalid option" ;;
esac

echo ""
echo "🎉 Done!"
