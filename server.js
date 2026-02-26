// Property Scraper API Server with ScraperAPI
// Run with: node server.js
// Endpoint: GET /api/scrape?url=...
// Uses ScraperAPI to bypass blocks

const http = require('http');
const https = require('https');

// ScraperAPI configuration
const SCRAPER_API_KEY = '0b281e9035c595a332e175b172d8b36e';

function fetchWithScraperAPI(url) {
    return new Promise((resolve, reject) => {
        const targetUrl = `https://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=true`;
        
        https.get(targetUrl, (resp) => {
            let data = '';
            
            resp.on('data', (chunk) => {
                data += chunk;
            });
            
            resp.on('end', () => {
                if (resp.statusCode === 200) {
                    resolve(data);
                } else {
                    reject(new Error(`ScraperAPI error: ${resp.statusCode}`));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

function extractPropertyData(html, url) {
    const data = {
        url: url,
        found: false,
        error: null
    };
    
    // Use regex to extract property data
    // Price patterns
    const priceMatches = html.match(/\$(\d{1,3}(?:,\d{3})+)/g);
    if (priceMatches) {
        const prices = priceMatches
            .map(p => parseInt(p.replace(/[$,]/g, '')))
            .filter(p => p >= 30000 && p <= 1000000);
        
        if (prices.length > 0) {
            // Usually the listing price is the largest reasonable one
            data.price = Math.max(...prices.filter(p => p < 500000));
            data.found = true;
        }
    }
    
    // Beds
    const bedsMatch = html.match(/(\d+)\s*(?:bed|beds|bedroom)/i);
    if (bedsMatch) {
        data.beds = parseInt(bedsMatch[1]);
        data.found = true;
    }
    
    // Baths
    const bathsMatch = html.match(/(\d+(?:\.\d+)?)\s*(?:bath|baths|bathroom)/i);
    if (bathsMatch) {
        data.baths = parseFloat(bathsMatch[1]);
        data.found = true;
    }
    
    // Sqft
    const sqftMatch = html.match(/([\d,]+)\s*(?:sqft|sq\.ft|square feet)/i);
    if (sqftMatch) {
        data.sqft = parseInt(sqftMatch[1].replace(/,/g, ''));
        data.found = true;
    }
    
    // Address from URL
    const urlParts = url.split('/');
    if (urlParts.length >= 4) {
        data.address = urlParts[3].replace(/-/g, ' ');
    }
    
    return data;
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const urlObj = new URL(req.url, 'http://localhost');
    
    // Health check
    if (urlObj.pathname === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', api: 'ScraperAPI' }));
        return;
    }
    
    // Scrape endpoint
    if (urlObj.pathname === '/api/scrape' && urlObj.searchParams.get('url')) {
        const targetUrl = urlObj.searchParams.get('url');
        
        console.log('Scraping:', targetUrl);
        
        try {
            const html = await fetchWithScraperAPI(targetUrl);
            const data = extractPropertyData(html, targetUrl);
            
            console.log('Result:', JSON.stringify(data));
            
            res.writeHead(200);
            res.end(JSON.stringify(data));
        } catch (error) {
            console.error('Error:', error.message);
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message, url: targetUrl }));
        }
    }
    else {
        res.writeHead(404);
        res.end(JSON.stringify({ 
            error: 'Use /api/scrape?url=...',
            example: '/api/scrape?url=https://www.zillow.com/homedetails/address' 
        }));
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Property API running on port ${PORT}`);
    console.log(`Using ScraperAPI: ${SCRAPER_API_KEY.substring(0, 8)}...`);
    console.log(`Usage: curl "http://localhost:${PORT}/api/scrape?url=URL"`);
});
