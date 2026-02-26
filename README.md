# Property Scraper API

Simple backend to fetch and parse property listing pages.

## Setup

```bash
cd property-api
npm install
node server.js
```

## Usage

The server provides an API endpoint:

```
GET http://localhost:3000/api/scrape?url=PROPERTY_URL
```

Example:
```
http://localhost:3000/api/scrape?url=https://renn.fortworthfocused.com/listing-detail/1177862117/2505-Shady-Ridge-Drive-Bedford-TX
```

## Response

```json
{
  "url": "...",
  "found": true,
  "address": "2505 Shady Ridge Drive",
  "price": "315000",
  "beds": "3",
  "baths": "2",
  "sqft": "1658",
  "source": "Fort Worth Focused"
}
```

## Supported Sites
- Fort Worth Focused (best support)
- Your Home Search DFW
- Zillow (limited)
- Generic parsing for others

## To Use with Dashboard

1. Run this server locally: `node server.js`
2. Note your local IP (e.g., 192.168.1.x)
3. Update dashboard to call your IP instead of localhost
4. Or use ngrok to expose it publicly
