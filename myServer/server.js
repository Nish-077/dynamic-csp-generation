/**
 * @license
 * Copyright (c) 2024-2025 Nishant Banakar, Manish P
 * This source code is licensed under the ISC license found in the
 * LICENSE file in the root directory of this source tree.
 */

require('dotenv').config();
const express = require("express");
const crypto = require("crypto");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs").promises;
const axios = require('axios');
const { dynamicCspGenerator } = require("./lib/dynamic-csp-gen.js");
const { main } = require("./lib/main.js");
// --- ADD THIS LINE to start the background worker ---
// require('./lib/url_queue_manager.js'); // Temporarily disabled for debugging

// --- Add file locks to prevent race conditions ---
let statsLock = false;
let violationLogLock = false;

async function logEvaluationStats(report) {
    // Wait if the file is currently being written to
    while (statsLock) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    statsLock = true;

    const statsFilePath = path.join(__dirname, 'evaluation-stats.json');
    let stats = {};

    try {
        const data = await fs.readFile(statsFilePath, 'utf8');
        stats = JSON.parse(data);
    } catch (err) {
        // File doesn't exist, start with an empty object
    }

    try {
        const reportData = report['csp-report'];
        // --- FIX: Add guard clauses for safety ---
        if (!reportData) return;

        const directive = reportData['violated-directive']?.replace('-elem', '').replace('-attr', '');
        const blockedUri = reportData['blocked-uri'];

        if (!directive || !blockedUri) return;

        // --- FIX: Log both external domains and 'inline' violations for stats ---
        if (blockedUri.startsWith('http') || blockedUri === 'inline') {
            const domain = blockedUri.startsWith('http') ? new URL(blockedUri).origin : 'inline';

            if (!stats[directive]) {
                stats[directive] = { violationCount: 0, discoveredDomains: [] };
            }
            stats[directive].violationCount++;
            if (!stats[directive].discoveredDomains.includes(domain)) {
                stats[directive].discoveredDomains.push(domain);
            }
        }

        await fs.writeFile(statsFilePath, JSON.stringify(stats, null, 2));

    } catch (error) {
        console.error('Error logging evaluation stats:', error);
    } finally {
        statsLock = false;
    }
}


async function logViolation(violation) {
    // --- REFACTORED: Log to a valid JSON array ---
    while (violationLogLock) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    violationLogLock = true;

    const logFilePath = path.join(__dirname, 'csp-violation.log');
    let violations = [];

    try {
        const data = await fs.readFile(logFilePath, 'utf8');
        if (data) {
            violations = JSON.parse(data);
        }
    } catch (err) {
        // File doesn't exist or is not valid JSON, start with an empty array
    }

    try {
        // --- FIX: Add a guard clause to prevent crashes from malformed reports ---
        const reportData = violation['csp-report'];
        if (!reportData) {
            console.error("Received a CSP report body with no 'csp-report' key. Skipping log.");
            return; // Exit gracefully
        }

        const newEntry = {
            timestamp: new Date().toISOString(),
            ...reportData
        };
        violations.push(newEntry);
        await fs.writeFile(logFilePath, JSON.stringify(violations, null, 2));
    } catch (error) {
        console.error('Error logging CSP violation:', error);
    } finally {
        violationLogLock = false;
    }
}

async function generateCSPForUrl(url) {
    try {
        const cspGen = await main(url);
        return Object.entries(cspGen)
            .filter(([directive, sources]) => {
                const defaultSrcString = cspGen["default-src"];
                return directive === "default-src" || sources !== defaultSrcString;
            })
            .map(([directive, sources]) => `${directive} ${sources}`)
            .join("; ") + ";";
    } catch (error) {
        console.error("Error generating CSP internally:", error);
        throw error;
    }
}

// Global error handlers
process.on('uncaughtException', err => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const port = process.env.PORT || 5000;

// App configuration
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(bodyParser.json({ type: ["application/json", "application/csp-report"] }));

// --- FIX: Serve static files from the 'lib' directory ---
app.use('/lib', express.static(path.join(__dirname, 'lib')));

// CORS middleware
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// Security middleware
app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString("base64");
    next();
});

// CSP middleware
app.use(async (req, res, next) => {
    if (["/page2", "/generate-csp", "/csp-report-endpoint"].includes(req.path)) {
        return next();
    }

    try {
        let data = await fs.readFile("./csp-header.txt", "utf8");
        let cspDirectives;

        if (!data) {
            console.log('No CSP data found, generating for:', req.hostname + req.path);
            const url = `${req.protocol}://${req.hostname}${req.port ? ':' + req.port : ''}${req.path}`;
            const cspHeader = await generateCSPForUrl(url);
            
            cspDirectives = {};
            cspHeader.split(';').forEach(directive => {
                if (directive.trim()) {
                    const [name, ...values] = directive.trim().split(' ');
                    cspDirectives[name] = values.join(' ');
                }
            });

            await fs.writeFile("./csp-header.txt", JSON.stringify(cspDirectives, null, 2));
        } else {
            cspDirectives = JSON.parse(data);
        }

        const nonce = res.locals.nonce;
        const cspHeader = Object.entries(cspDirectives)
            .filter(([directive, sources]) => {
                if (directive === 'report-uri') return true;
                const defaultSrcString = cspDirectives["default-src"];
                return directive === "default-src" || sources !== defaultSrcString;
            })
            .map(([directive, sources]) => {
                if (["script-src", "style-src"].includes(directive)) {
                    sources += ` 'nonce-${nonce}'`;
                }
                return `${directive} ${sources}`;
            })
            .join("; ") + ";";

        res.setHeader("Content-Security-Policy", cspHeader);
        res.locals.csp = cspHeader;
    } catch (error) {
        console.error("Error in CSP middleware:", error);
    }
    next();
});

// Routes
app.get("/", (req, res) => {
    console.log('Serving main page...');
    res.render("index", { 
        nonce: res.locals.nonce, 
        csp: res.locals.csp 
    });
});

app.get("/page2", (req, res) => {
    console.log('Serving page2...');
    res.render("page2");
});

app.get("/csp-generator", (req, res) => {
    res.render("csp-generator", { 
        nonce: res.locals.nonce 
    });
});

app.get("/inline-test", (req, res) => {
    console.log('Serving inline security test page...');
    res.render("inline-test", { 
        nonce: res.locals.nonce, 
        csp: res.locals.csp 
    });
});

app.post("/generate-csp", async (req, res) => {
    try {
        const url = req.body.urlInput;
        const cspGen = await main(url);
        
        const cspHeader = "Content-Security-Policy: " + 
            Object.entries(cspGen)
                .filter(([directive, sources]) => {
                    const defaultSrcString = cspGen["default-src"];
                    return directive === "default-src" || sources !== defaultSrcString;
                })
                .map(([directive, sources]) => {
                    if (["script-src", "style-src"].includes(directive)) {
                        sources += ` 'nonce-${res.locals.nonce}'`;
                    }
                    return `${directive} ${sources}`;
                })
                .join("; ") + ";";

        res.json({ csp: cspHeader });
    } catch (error) {
        console.error("Error generating CSP:", error);
        res.status(500).json({ error: "Failed to generate CSP" });
    }
});

app.post("/csp-report-endpoint", async (req, res) => {
    try {
        /*
         * KNOWN LIMITATION:
         * This system relies on receiving CSP violation reports to dynamically update the policy.
         * However, two edge cases have been identified with the Disqus widget:
         * 1. Inline Style Attributes: The browser reports a 'style-src-attr' violation but sends an
         *    empty 'script-sample'. Without the sample, a hash cannot be generated, and the violation
         *    cannot be automatically resolved without resorting to 'unsafe-inline'.
         * 2. Missing Connection Reports: Some third-party scripts (e.g., from liadm.com) may have
         *    their network requests blocked by 'connect-src', but the browser fails to send a
         *    violation report to this endpoint. If no report is received, the policy cannot be updated.
         * These are limitations of browser reporting and third-party script behavior, not the generator logic.
        */
        await Promise.all([
            dynamicCspGenerator(req.body),
            logViolation(req.body),
            logEvaluationStats(req.body) // Add the new logging function here
        ]);
        res.sendStatus(204);
    } catch (error) {
        console.error("Error processing CSP report:", error);
        res.sendStatus(500);
    }
});

// Add test content route
app.get("/api/test-content", (req, res) => {
    // Deliberately using some known malicious patterns
    const testContent = {
        scripts: [
            'https://malware.testing.google.test/somedomain/test.js',
            'https://jsonp.testing.google.test/api?callback=jsonpCallback',
            'https://eval.testing.google.test/script?callback=evalTest'
        ],
        images: [
            'https://malware.testing.google.test/images/test.jpg',
            'https://clean.testing.google.test/images/safe.jpg'
        ]
    };
    res.json(testContent);
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
