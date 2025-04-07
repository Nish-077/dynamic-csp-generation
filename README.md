# Dynamic CSP Generation and Security Analysis

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

An automated system for Content Security Policy (CSP) generation and dynamic adjustment based on security threat detection.

## Project Overview

This project implements an intelligent system that automatically generates and adapts Content Security Policies for web applications. It provides two modes of operation:

1. **Static CSP Generation** (`main.js`):
   - Use this mode to generate an initial static CSP for any website
   - Quick and straightforward way to create a baseline CSP
   - Perfect for initial security setup

2. **Dynamic CSP Analysis & Adjustment** (`myServer/`):
   - Use this mode to test and evolve your CSP in real-time
   - Monitors CSP violations and adapts policies automatically
   - Includes visualization tools and security analysis

### Key Features

- **Automated CSP Generation**: Crawls web pages to generate initial CSP rules based on resource usage
- **Dynamic Policy Adjustment**: Analyzes CSP violation reports and automatically updates policies
- **Security Analysis**:
  - JSONP Vulnerability Detection
  - Malicious URL Detection (via VirusTotal API)
  - Resource Usage Analysis

### Technology Stack

- **Backend**: Node.js with Express
- **Template Engine**: EJS
- **Testing**: Jest
- **Data Visualization**: Python (matplotlib, pandas)
- **Security Tools**: 
  - VirusTotal API Integration
  - WebAssembly Security Modules
  - Dynamic CSP Header Management

## Getting Started

### Static CSP Generation

1. To generate a static CSP for any website:
   ```bash
   node main.js <website-url>
   ```
   This will crawl the website and generate an initial CSP based on resource usage.

### Dynamic CSP Testing and Analysis

If you want to test and analyze CSP behavior in real-time:

1. Navigate to the server directory:
   ```bash
   cd myServer
   ```

2. Install server dependencies:
   ```bash
   npm install
   ```

3. Start the test server:
   ```bash
   npm run dev
   ```

This will start a server that monitors CSP violations and automatically adjusts policies based on detected threats.

### Prerequisites

- Node.js (v20.15.0)
- Python 3.x (for visualization tools)
- VirusTotal API Key (for malicious URL detection)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Nish-077/webcrawler-csp.git
   cd webcrawler-csp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a .env file and add your VirusTotal API key:
   ```
   VIRUSTOTAL_APIKEY=your_api_key_here
   ```

4. Start the server:
   ```bash
   cd myServer
   npm run dev
   ```

## Features in Detail

### Web Crawler
- Automatically extracts resource URLs from web pages
- Categorizes resources by type (scripts, styles, images, etc.)
- Handles both relative and absolute URLs

### Security Analysis
- Real-time CSP violation monitoring
- JSONP vulnerability detection
- Malicious URL scanning
- Performance impact analysis with visualization

### Visualization Tools
- CSP violation distribution charts
- Page load time comparisons
- URL security analysis statistics

### Dynamic CSP Management
- Automatic policy generation
- Real-time policy updates based on violations
- Nonce-based inline script handling
- Protected resource whitelisting

## Project Structure

```
├── server.js           # Main server configuration
├── crawl.js           # Web crawler implementation
├── url_checking.js    # URL security verification
├── jsonp_checking.js  # JSONP vulnerability detection
├── csp_gen.js        # CSP generation logic
└── myServer/
    ├── public/       # Static assets
    ├── views/        # EJS templates
    └── results/      # Analysis results and graphs
```

## Team

- **Nishant Banakar** (PES1UG22CS396)
  - Email: banakarnishant@gmail.com

- **Manish P** (PES1UG22CS332)
  - Email: manish.kailasam@gmail.com

## License

ISC License