# HaloPod Digital Research Platform

## Project Title
HaloPod — Engineering a Salinity-Responsive Smart Bio-Capsule to Support Mangrove Restoration Across Diverse and Challenging Environments and Promote Blue Carbon Potential

## Overview
A digital engineering and computational research platform presenting the HaloPod concept — a proposed biodegradable capsule designed to create a more controlled local environment around mangrove propagules under changing coastal salinity conditions.

**Important:** No physical prototype or laboratory experiments have been completed. This platform presents computational modeling, engineering analysis, and design documentation.

## How to Run

### Option 1: Direct File Open
Open `index.html` in a modern web browser (Chrome, Firefox, Edge, Safari).

### Option 2: Local Server (recommended)
```bash
# Using Python
cd platform
python -m http.server 8000
# Then open http://localhost:8000

# Using Node.js
npx serve platform

# Using VS Code: Install "Live Server" extension, right-click index.html → "Open with Live Server"
```

## Project Structure
```
platform/
├── index.html              # Main application (single-page app)
├── README.md               # This file
├── css/
│   └── styles.css          # Complete stylesheet
├── js/
│   ├── app.js              # Application controller and routing
│   ├── simulation.js       # 1D diffusion simulation engine
│   ├── charts.js           # Custom SVG charting library
│   └── virtual-lab.js      # Virtual experiment controller
├── research/
│   └── parameter-ledger.md # Parameter source tracking
├── reports/
│   └── technical-report.md # Full technical report
└── assets/                 # Reserved for additional assets
```

## Features

### Fully Functional
- 7-page interactive research platform (Home, Problem, Science, Design, Virtual Lab, Results, Research)
- Hash-based SPA navigation with mobile support
- Responsive design (desktop + tablet + mobile)
- Interactive capsule diagrams (assembled, cross-section, exploded views)
- 1D diffusion simulation using Fick's Second Law (conservative form)
- Explicit finite-difference solver with harmonic mean interface treatment
- 6-step guided virtual experiment
- Real-time simulation visualization with animated layer colouring
- Multiple external salinity scenarios (constant, tidal, storm surge, gradual)
- Three design scenarios (control, hydrogel only, full HaloPod)
- Adjustable parameters (layer thicknesses, diffusion coefficients)
- Scenario comparison charts
- Sensitivity analysis (hydrogel D, biochar D)
- KaTeX mathematical equation rendering
- Downloadable experiment summary
- Comprehensive technical report and parameter ledger

### Illustrative Assumptions (NOT Measured)
- All diffusion coefficient values
- All layer thickness ratios
- Salinity scenario parameters
- Clearly labeled throughout the platform

### Scientific Claims Requiring Verification
- Whether the capsule actually reduces salt exposure
- Whether reduced salt exposure improves germination
- Actual D values for HaloPod materials
- Effect of biochar on hydrogel diffusion properties
- Ion-specific transport differences (Na⁺ vs Cl⁻)
- Biodegradation timeline

### Known Limitations
- 1D simplification of 3D capsule geometry
- Constant (not concentration-dependent) diffusion coefficients
- No swelling dynamics modeled
- No biodegradation modeled
- No biological interaction modeling
- KaTeX requires internet connection (CDN)
- Inter font requires internet connection (CDN)

## Technology
- HTML5, CSS3, JavaScript (ES6+)
- No build tools, no backend, no paid APIs
- KaTeX (CDN) for math rendering
- Google Fonts (CDN) for Inter typeface
- Custom SVG charting (zero dependencies)

## Scientific Integrity
- All parameters labeled as illustrative assumptions
- No experimental results claimed or invented
- Model outputs vs physical measurements distinguished explicitly
- Limitations documented prominently
- Poster methodology inconsistency (Fava beans vs mangrove propagules) flagged
