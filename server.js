// Property Scraper API Server with curl_cffi
// Run with: node server.js
// Endpoint: GET /api/scrape?url=...

const http = require('http');
const { spawn } = require('child_process');

// Use Python with curl_cffi for scraping
function scrapeProperty(url) {
    return new Promise((resolve, reject) => {
        const pythonScript = `
import sys
import curl_cffi
import re
import json

session = curl_cffi.Session(impersonate="chrome")
url = sys.argv[1]

try:
    response = session.get(url)
    html = response.text
    
    data = {"url": url, "found": False}
    
    # Address from title
    title_match = re.search(r'<title>([^<]+)</title>', html)
    if title_match:
        data["address"] = title_match.group(1).split(" - ")[0]
    
    # Price - find $xxx,xxx patterns
    prices = re.findall(r'\\$(\\d{1,3}(?:,\\d{3})*)', html)
    price_vals = [int(p.replace(",", "")) for p in prices if 50000 <= int(p.replace(",", "")) <= 2000000]
    if price_vals:
        data["price"] = max(price_vals)
        data["found"] = True
    
    # Beds
    beds_match = re.search(r'(\\d+)\\s*(?:bed|bedroom)', html, re.I)
    if beds_match:
        data["beds"] = beds_match.group(1)
        data["found"] = True
    
    # Baths  
    baths_match = re.search(r'(\\d+\\.?\\d*)\\s*(?:bath|bathroom)', html, re.I)
    if baths_match:
        data["baths"] = baths_match.group(1)
        data["found"] = True
    
    # Sqft
    sqft_match = re.search(r'([\\d,]+)\\s*(?:sqft|sq\\.ft)', html, re.I)
    if sqft_match:
        data["sqft"] = sqft_match.group(1).replace(",", "")
    
    # Type
    type_match = re.search(r'Property Type[:\\s]+([^\\n<]+)', html, re.I)
    if type_match:
        data["type"] = type_match.group(1).strip()[:50]
    
    print(json.dumps(data))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;
        
        const python = spawn('python3', ['-c', pythonScript, url], {
            env: { ...process.env, PYTHONPATH: '/home/claw/.openclaw/venv/lib/python3.14/site-packages' }
        });
        
        let output = '';
        python.stdout.on('data', (data) => { output += data; });
        python.stderr.on('data', (data) => { console.error('Python error:', data.toString()); });
        python.on('close', (code) => {
            if (code === 0) {
                try {
                    resolve(JSON.parse(output));
                } catch(e) {
                    reject(new Error('Failed to parse output: ' + output));
                }
            } else {
                reject(new Error('Python process failed'));
            }
        });
    });
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const urlObj = new URL(req.url, 'http://localhost');
    
    if (urlObj.pathname === '/api/scrape' && urlObj.searchParams.get('url')) {
        const targetUrl = urlObj.searchParams.get('url');
        
        try {
            console.log('Scraping:', targetUrl);
            const data = await scrapeProperty(targetUrl);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        } catch (error) {
            console.error('Error:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    }
    else if (urlObj.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
    }
    else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Use /api/scrape?url=...' }));
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Property API running on port ${PORT}`);
    console.log(`Usage: curl "http://localhost:${PORT}/api/scrape?url=URL"`);
});
