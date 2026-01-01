const axios = require('axios');

const API_URL = 'https://srvnddb01.dna.go.th/nddb/getlab10Data';
const TOKEN = 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJsYWIxMF9hcGkiLCJpYXQiOjE3MzUxODkxMjIsImV4cCI6MTc2NjcyNTEyMn0.cOKSFwpMBuR8064MhE5SVI57J7XIHxkVfIwrBqASmcODT8W42h8R42LydVhBMhUE2ODcmGGsRLWVdsOwXPABYQ';

async function checkYear(thaiYear) {
    try {
        const response = await axios.get(API_URL, {
            params: {
                dateFrom: `${thaiYear}-01-01`,
                dateTo: `${thaiYear}-12-31`,
                page: 1,
                pageSize: 1
            },
            headers: { 'Authorization': `Bearer ${TOKEN}` },
            timeout: 10000
        });
        return { thaiYear, total: response.data.total || 0 };
    } catch (err) {
        return { thaiYear, total: 0, error: err.message };
    }
}

async function main() {
    console.log('🔍 ตรวจสอบข้อมูลจาก NDDB API (ปี พ.ศ.)\n');
    console.log('ปี พ.ศ.\t\tจำนวน');
    console.log('─'.repeat(30));
    
    // ตรวจสอบปี พ.ศ. 2551-2568
    for (let thaiYear = 2551; thaiYear <= 2568; thaiYear++) {
        const result = await checkYear(thaiYear);
        const count = result.total.toLocaleString().padStart(10);
        const status = result.total > 100 ? '✅' : result.total > 0 ? '⚠️' : '❌';
        console.log(`${thaiYear}\t\t${count} ${status}`);
        await new Promise(r => setTimeout(r, 300));
    }
}

main();
