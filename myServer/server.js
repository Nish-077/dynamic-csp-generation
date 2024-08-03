require('dotenv').config();
const express = require("express");
const crypto = require("crypto");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs").promises;
const { dynamicCspGenerator } = require("./public/js/dynamic-csp-gen.js");
const { main } = require("../main.js");

process.on('uncaughtException', (err) => {
    console.error('There was an uncaught error', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const port = 5000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));
app.use(
    bodyParser.json({ type: ["application/json", "application/csp-report"] })
);
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

app.use(
    "/wasm-file",
    express.static(
        path.join(__dirname, "public/wasm", "shared-label-worker.wasm"),
        {
            setHeaders: (res, path, stat) => {
                res.set("Content-Type", "application/wasm");
            },
        }
    )
);

app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString("base64");
    next();
});

app.use(async (req, res, next) => {
    const excludedPaths = ["/page2"];
    if (excludedPaths.includes(req.path)) {
        return next();
    }

    const nonce = res.locals.nonce;
    try {
        const data = await fs.readFile(
            "C:/Non-Software/Coding_Things/Cloud_Security/dynamic-csp-generation/csp-header.txt",
            "utf8"
        );
        if (data !== "") {
            const cspDirectives = JSON.parse(data);
            let cspHeader = Object.entries(cspDirectives)
                .filter(([directive, sources]) => {
                    const defaultSrcString = cspDirectives["default-src"];
                    return directive === "default-src" || sources !== defaultSrcString;
                })
                .map(([directive, sources]) => {
                    if (directive === "script-src" || directive === "style-src") {
                        sources += ` 'nonce-${nonce}'`;
                    }
                    return `${directive} ${sources}`;
                })
                .join("; ");
            cspHeader += ";";
            res.setHeader("Content-Security-Policy-Report-Only", cspHeader);
            res.locals.csp = cspHeader;
        }
        else res.locals.csp = null;

        next();
    } catch (error) {
        console.error("Error reading from file", error);
        res.status(500).send("Server Error");
        return next();
    }
});

app.get("/", async (req, resp) => {
    console.log('serving main page...');
    resp.render("index", { nonce: resp.locals.nonce, csp: resp.locals.csp, APIKEY: process.env.GOOGLE_APIKEY });
});


app.get("/page2", (req, res) => {
    console.log('serving page2..');
    res.sendFile(path.join(__dirname, "views", "page2.html"));
    res.render("page2", { APIKEY: process.env.GOOGLE_APIKEY })
});

app.get("/csp-generator", (req, res) => {
    res.render("csp-generator", { nonce: res.locals.nonce });
});

app.post("/csp-generate", async (req, res) => {
    const nonce = res.locals.nonce;
    const url = req.body.urlInput;
    const cspGen = await main(url);
    let cspHeader = "Content-Security-Policy: ";
    cspHeader += Object.entries(cspGen)
        .filter(([directive, sources]) => {
            const defaultSrcString = cspGen["default-src"];
            return directive === "default-src" || sources !== defaultSrcString;
        })
        .map(([directive, sources]) => {
            if (directive === "script-src" || directive === "style-src") {
                sources += ` 'nonce-${nonce}'`;
            }
            return `${directive} ${sources}`;
        })
        .join("; ");
    cspHeader += ";";
    res.json({ csp: cspHeader });
});


let writeLock = false;

function waitForLock() {
    return new Promise((resolve) => {
        (function waitForUnlock() {
            if (!writeLock) {
                resolve();
            } else {
                setTimeout(waitForLock, 500);
            }
        })();
    });
}

async function writeToFile(newReport) {
    await waitForLock();
    writeLock = true;
    try {
        let reportObj = JSON.parse(JSON.stringify(newReport));
        delete reportObj["csp-report"]["original-policy"];
        const data = await fs.readFile("csp-violation.log", "utf8");
        const lines = data.split(/\r?\n/);

        const lineSet = new Set(lines);
        const reportString = JSON.stringify(reportObj);

        if (!lineSet.has(reportString)) {
            lineSet.add(reportString);
            console.log("Writing to csp-violation.log");
        }
        await fs.writeFile("csp-violation.log", Array.from(lineSet).join("\n"));
    } catch (error) {
        console.error("Error reading from file", error);
        throw new Error("Error in writeToFile function");
    } finally {
        writeLock = false;
    }
}

app.post("/csp-report-endpoint", async (req, resp) => {
    try {
        await writeToFile(req.body);
        await dynamicCspGenerator(req.body);
        resp.sendStatus(204);
    } catch (error) {
        console.error(error);
        return resp.sendStatus(500); // Internal Server Error
    }
});

app.listen(port, () => {
    console.log(`Server is up and running at http://localhost:${port}`);
});
