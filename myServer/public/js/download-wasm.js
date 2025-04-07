const fs = require('fs');
const path = require('path');
const axios = require('axios');
const https = require('https');

const config = {
    wasmUrl: 'https://maps.googleapis.com/maps-api-v3/api/js/57/8b-beta/shared-label-worker.js',
    localFilePath: path.join(__dirname, '../wasm', 'shared-label-worker.wasm'),
    metadataPath: path.join(__dirname, '../metadata', 'metadata.json')
};

async function ensureDirectoryExists(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function validateWasmFile(filePath) {
    try {
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
            throw new Error('WASM file is empty');
        }
        
        const buffer = fs.readFileSync(filePath);
        // Check for WASM magic number
        if (buffer[0] !== 0x00 || buffer[1] !== 0x61 || buffer[2] !== 0x73 || buffer[3] !== 0x6D) {
            throw new Error('Invalid WASM file format');
        }
        return true;
    } catch (error) {
        console.error('WASM validation failed:', error.message);
        return false;
    }
}

async function downloadWasm() {
    try {
        await ensureDirectoryExists(config.localFilePath);
        await ensureDirectoryExists(config.metadataPath);

        const response = await axios.get(config.wasmUrl, {
            httpsAgent: new https.Agent({ keepAlive: true }),
            responseType: 'arraybuffer',
            timeout: 10000,
            maxContentLength: 10 * 1024 * 1024 // 10MB limit
        });

        fs.writeFileSync(config.localFilePath, response.data);

        if (!await validateWasmFile(config.localFilePath)) {
            throw new Error('Downloaded file failed validation');
        }

        // Save metadata
        const metadata = {
            downloadDate: new Date().toISOString(),
            fileSize: fs.statSync(config.localFilePath).size,
            sourceUrl: config.wasmUrl,
            hash: require('crypto')
                .createHash('sha256')
                .update(response.data)
                .digest('hex')
        };

        fs.writeFileSync(config.metadataPath, JSON.stringify(metadata, null, 2));
        console.log('WASM file downloaded and validated successfully');
        return true;
    } catch (error) {
        console.error('Error downloading WASM file:', error.message);
        // Clean up failed download
        if (fs.existsSync(config.localFilePath)) {
            fs.unlinkSync(config.localFilePath);
        }
        return false;
    }
}

module.exports = { downloadWasm };