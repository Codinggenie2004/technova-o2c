/**
 * Custom CDS server — adds CORS headers for cross-origin requests
 * Allows Live Server (any port) to call the CAP API on port 4004
 */
const cds = require('@sap/cds');

cds.on('bootstrap', (app) => {
    // ── CORS Middleware ─────────────────────────────────────────
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token');

        // Handle preflight
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        next();
    });
});

module.exports = cds.server;
