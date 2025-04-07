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
const { dynamicCspGenerator } = require("./public/js/dynamic-csp-gen.js");
const { main } = require("../main.js");

async function logViolation(violation) {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({
        timestamp,
        ...violation['csp-report']
    }, null, 2);
    
    try {
        await fs.appendFile(
            path.join(__dirname, 'csp-violation.log'),
            logEntry + '\n---\n'
        );
    } catch (error) {
        console.error('Error logging CSP violation:', error);
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
app.use(express.static("public"));
app.use(bodyParser.json({ type: ["application/json", "application/csp-report"] }));

// CORS middleware
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// WebAssembly file serving
app.use("/wasm-file", express.static(
    path.join(__dirname, "public/wasm", "shared-label-worker.wasm"),
    { setHeaders: (res) => res.set("Content-Type", "application/wasm") }
));

// Security middleware
app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString("base64");
    next();
});

// CSP middleware
app.use(async (req, res, next) => {
    if (["/page2", "/csp-generate", "/csp-report-endpoint"].includes(req.path)) {
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

        res.setHeader("Content-Security-Policy-Report-Only", cspHeader);
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

app.post("/csp-generate", async (req, res) => {
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
        await Promise.all([
            dynamicCspGenerator(req.body),
            logViolation(req.body)
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
