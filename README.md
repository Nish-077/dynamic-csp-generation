# Dynamic CSP Generation and Management System

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

An intelligent system that automates the Content Security Policy (CSP) lifecycle, from initial generation to dynamic, real-time adaptation and security vetting.

## Project Overview

Configuring and maintaining a Content Security Policy is critical for web security but is notoriously difficult. This project provides a comprehensive solution by automating the entire process. It operates in two distinct phases:

1.  **Phase 1: Static Analysis & Baseline Generation**
    *   A web-based tool crawls a target application to discover all its resources (scripts, styles, images, etc.).
    *   It generates a strict, secure baseline policy, vetting all external domains against threat intelligence feeds before inclusion.

2.  **Phase 2: Dynamic Learning & Management**
    *   A Node.js server runs the application in a non-blocking "report-only" mode.
    *   It listens for CSP violation reports, automatically updating the policy to allow legitimate resources.
    *   It uses a sophisticated "trust, then verify" model, where new domains are immediately allowed (to prevent breaking functionality) and then vetted asynchronously in a background queue. This model ensures that new, legitimate resources do not break application functionality. While the resource is temporarily trusted, it is immediately added to a queue for asynchronous security vetting. If the resource is found to be malicious, it is removed from the CSP and an issue is logged.
    *   It secures dynamically injected inline scripts and styles using a unique, nonce-based client-side handler.

## How it Works

### Static CSP Generation
![Static CSP Generation](https://raw.githubusercontent.com/Nish-077/dynamic-csp-generation/main/static-csp-generation.jpg)

### Dynamic CSP Adjustment
![Dynamic CSP Adjustment](https://raw.githubusercontent.com/Nish-077/dynamic-csp-generation/main/dynamic-csp-adjustment.jpg)

### Key Features

-   **Automated Web Crawler**: Discovers all resources required by an application.
-   **Intelligent Policy Generation**: Creates strict, origin-based policies, avoiding brittle, path-specific rules.
-   **Asynchronous Security Pipeline**:
    -   **JSONP Vulnerability Detection**: Uses heuristics to identify and flag high-risk JSONP endpoints.
    -   **Malicious URL Vetting**: Integrates with the VirusTotal API to check domains against dozens of security vendor databases.
    -   **Non-Blocking Queue**: Ensures security checks don't impact server performance.
-   **Dynamic Policy Adaptation**: Learns from real-time violation reports to evolve the CSP.
-   **Robust Inline Security**: A client-side handler (`inline-handler.js`) automatically applies nonces to dynamically added inline scripts and styles, preventing a major XSS vector without breaking trusted third-party widgets.
-   **Automated Evaluation**: Includes Python scripts to generate performance and security visualizations from system logs.

### Technology Stack

-   **Backend**: Node.js, Express.js
-   **Frontend & Templating**: EJS (Embedded JavaScript)
-   **Security & Analysis**:
    -   VirusTotal API for threat intelligence.
    -   `jsdom` for server-side DOM parsing during the crawl.
-   **Data Visualization**: Python (matplotlib, seaborn, pandas)
-   **Development**: `nodemon` for live reloading, `jest` for testing.

## Getting Started

### Prerequisites

-   Node.js (v20.15.0 or as specified in `.nvmrc`)
-   An active VirusTotal API Key.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```

2.  **Navigate to the server directory:**
    All project dependencies and scripts are managed within the `myServer` directory.
    ```bash
    cd myServer
    ```

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Set up your environment:**
    Create a `.env` file in the `myServer` directory and add your VirusTotal API key:
    ```
    VIRUSTOTAL_APIKEY=your_virustotal_api_key_here
    ```

### Running the System

The system can be used in two primary ways from the `myServer` directory:

**1. Generate a Baseline Policy (Static Analysis)**

Use the web interface to generate a baseline policy for any public website.

-   **Start the server:**
    ```bash
    npm run dev
    ```
-   **Open your browser** and navigate to `http://localhost:5000/csp-generator`.
-   Enter the URL of the site you want to analyze and submit. The generated policy will be saved to `myServer/csp-header.txt`.

**2. Run the Dynamic Learning Server**

The main purpose of the server is to host a sample application and demonstrate the dynamic learning capabilities.

-   **Start the server:**
    ```bash
    npm run dev
    ```
-   **Access the demo application** at `http://localhost:5000`. This page includes a complex Disqus widget that will trigger numerous CSP violations.
-   The server will log these violations, and the `dynamic-csp-gen.js` module will automatically update `myServer/csp-header.txt` to resolve them.
-   **Test inline security** at `http://localhost:5000/inline-test` to see how the nonce-based handler works.

## Project Structure

```
.
└── myServer/
    ├── server.js               # Main Express server, middleware, and routes
    ├── package.json            # Project dependencies and scripts
    ├── csp-header.txt          # The active, machine-managed CSP file
    ├── issues.txt              # Log of detected security issues (malware, JSONP)
    ├── evaluation-stats.json   # Raw data for violation charts
    ├── lib/
    │   ├── crawl.js            # Static analysis web crawler
    │   ├── csp_gen.js          # Baseline CSP generation logic
    │   ├── dynamic-csp-gen.js  # Handles violation reports to update the CSP
    │   ├── url_checking.js     # Core security vetting logic (VirusTotal, JSONP)
    │   ├── url_queue_manager.js# Asynchronous queue for the security pipeline
    │   └── inline-handler.js   # Client-side script for nonce management
    ├── views/
    │   ├── index.ejs           # Main demo page with Disqus widget
    │   ├── csp-generator.ejs   # UI for the static analysis tool
    │   └── inline-test.ejs     # Page for testing inline script security
    └── evaluation/
        ├── eval_csp_violations.py # Generates violation charts
        └── eval_page_load_time.py # Generates performance charts
```

## Team

-   **Nishant Banakar** (PES1UG22CS396)
-   **Manish Ponnukailasam** (PES1UG22CS332)

## Contributing

We welcome contributions to this project. Please feel free to open an issue or submit a pull request.

### Bug Reports & Feature Requests

Please open an issue on the GitHub repository. Provide as much detail as possible, including steps to reproduce the bug or a clear description of the requested feature.

### Pull Requests

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and commit them with a clear and concise message.
4.  Push your changes to your fork.
5.  Open a pull request to the `main` branch of the original repository.

## License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.