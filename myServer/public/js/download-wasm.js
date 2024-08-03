const fs = require('fs');
const path = require('path');
const axios = require('axios');
const https = require('https');

const wasmUrl = 'https://maps.googleapis.com/maps-api-v3/api/js/57/8b-beta/shared-label-worker.js';
const localFilePath = path.join('C:/Non-Software/Coding_Things/Cloud_Security/dynamic-csp-generation/myServer/public/wasm', 'shared-label-worker.wasm');
const metadataFilePath = path.join('C:/Non-Software/Coding_Things/Cloud_Security/dynamic-csp-generation/myServer/public/metadata', 'metadata.json');

async function downloadWasm() {
  try {
    // Read metadata to get the last modified date
    let lastModified = null;
    if (fs.existsSync(metadataFilePath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));
      lastModified = metadata.lastModified;
    }

    // Set up headers
    const headers = {};
    if (lastModified) {
      headers['If-Modified-Since'] = lastModified;
    }

    // Create a custom https agent to handle TLS options
    const agent = new https.Agent({
      rejectUnauthorized: false // Set this to true if you want to verify the SSL certificate
    });

    // Fetch the WASM file with increased timeout and retry logic
    const response = await axios.get(wasmUrl, {
      headers: headers,
      responseType: 'stream',
      timeout: 10000, // 10 seconds timeout
      httpsAgent: agent
    });

    // Check if the content is not modified
    if (response.status === 304) {
      console.log('The WASM file is up to date.');
      return;
    }

    // Save the WASM file
    const writer = fs.createWriteStream(localFilePath);
    response.data.pipe(writer);

    writer.on('finish', () => {
      // Save metadata
      const metadata = {
        lastModified: response.headers['last-modified']
      };
      fs.writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2));

      console.log('The WASM file has been updated.');
    });

    writer.on('error', (err) => {
      console.error('Error writing the WASM file:', err);
    });

  } catch (error) {
    if (error.response && error.response.status === 304) {
      console.log('The WASM file is up to date.');
    } else {
      console.error('Error downloading the WASM file:', error);
      // Retry logic (for simplicity, retry once)
      setTimeout(downloadWasm, 5000); // Retry after 5 seconds
    }
  }
}

// Run the download function
module.exports = {
    downloadWasm
}