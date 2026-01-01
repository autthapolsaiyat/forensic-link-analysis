#!/bin/bash
# =====================================================
# FORENSIC LINK ANALYSIS - Batch Import Runner
# =====================================================

echo "🚀 Forensic Link Analysis - Batch Import"
echo "========================================="
echo ""

# Default dates (last week of December 2024)
FROM_DATE=${1:-"2024-12-20"}
TO_DATE=${2:-"2024-12-31"}

echo "📅 Import Date Range: $FROM_DATE to $TO_DATE"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Run import
echo "🔄 Starting import..."
echo ""
node batch_import.js "$FROM_DATE" "$TO_DATE"

echo ""
echo "✅ Import script finished!"
