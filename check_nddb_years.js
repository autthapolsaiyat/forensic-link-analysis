const http = require('http');

const CONFIG = {
  host: 'nddb',
  port: 809,
  site: 'RTP10'
};

function fetchCaseCount(fromDate, toDate) {
  return new Promise((resolve, reject) => {
    const url = `/webservice.asmx/getCaseListFromDate?site=${CONFIG.site}&fromDate=${fromDate}&toDate=${toDate}`;
    
    http.get({ hostname: CONFIG.host, port: CONFIG.port, path: url }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(Array.isArray(result) ? result.length : 0);
        } catch (e) {
          resolve(0);
        }
      });
    }).on('error', () => resolve(0));
  });
}

async function main() {
  console.log('🔍 ตรวจสอบข้อมูลจาก NDDB API\n');
  console.log('ปี ค.ศ.\t\tปี พ.ศ.\t\tจำนวนคดี');
  console.log('─'.repeat(45));
  
  for (let year = 2008; year <= 2025; year++) {
    const thaiYear = year + 543;
    const count = await fetchCaseCount(`${year}-01-01`, `${year}-12-31`);
    const status = count > 1000 ? '✅' : count > 0 ? '⚠️' : '❌';
    console.log(`${year}\t\t${thaiYear}\t\t${count.toLocaleString().padStart(10)} ${status}`);
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n═══════════════════════════════════════════');
}

main();
