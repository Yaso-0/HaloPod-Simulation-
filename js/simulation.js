'use strict';

/**
 * HaloPod 1D Diffusion Simulation Engine
 * 
 * Solves: ∂C/∂t = ∂/∂x [D(x) ∂C/∂x]
 * 
 * Uses explicit finite-difference (Forward Euler time, central space)
 * with harmonic mean for interface diffusion coefficients.
 * 
 * All parameters are ILLUSTRATIVE ASSUMPTIONS — not experimentally measured.
 * Concentration is NORMALIZED (0 = salt-free, 1 = external salinity level).
 */

class DiffusionSimulation {
    constructor(config = {}) {
        // Grid resolution
        this.N = config.N || 200; // number of spatial grid points
        
        // Default layer thicknesses (normalized, sum = 1.0)
        this.layers = {
            chitosan:  config.chitosanThickness  || 0.05,
            hydrogel:  config.hydrogelThickness   || 0.35,
            biochar:   config.biocharThickness    || 0.30,
            chamber:   config.chamberThickness    || 0.30
        };
        
        // Default diffusion coefficients (relative to reference D=1.0 in water)
        // THESE ARE ILLUSTRATIVE ASSUMPTIONS — NOT MEASURED
        this.diffCoeffs = {
            chitosan: config.dChitosan || 0.3,
            hydrogel: config.dHydrogel || 0.5,
            biochar:  config.dBiochar  || 0.2,
            chamber:  config.dChamber  || 0.8,
            water:    1.0  // reference
        };
        
        // Scenario
        this.scenario = config.scenario || 'fullHaloPod'; // 'control', 'hydrogelOnly', 'fullHaloPod'
        
        // External salinity
        this.salinityType = config.salinityType || 'constant';
        this.salinityParams = config.salinityParams || { level: 1.0 };
        
        // Simulation time
        this.totalTime = config.totalTime || 1.0;
        this.maxSteps = config.maxSteps || 50000;
        
        // State
        this.C = null;        // concentration array
        this.D = null;        // diffusion coefficient array
        this.x = null;        // spatial positions
        this.dx = 0;
        this.dt = 0;
        this.time = 0;
        this.stepCount = 0;
        this.history = { t: [], cCore: [], cAvg: [] };
        this.layerBoundaries = [];
        this.layerMap = [];   // which layer each grid point belongs to
        
        this._initialized = false;
    }
    
    /**
     * Initialize the grid, set D(x) based on scenario, set IC
     */
    initialize() {
        const L = 1.0; // total normalized domain length
        this.dx = L / (this.N - 1);
        this.x = Array.from({length: this.N}, (_, i) => i * this.dx);
        
        // Build D(x) array based on scenario and layer structure
        this._buildDiffusionProfile();
        
        // Calculate stable time step: dt <= dx^2 / (2 * D_max)
        const Dmax = Math.max(...this.D);
        this.dt = 0.4 * this.dx * this.dx / (2.0 * Dmax); // safety factor 0.4
        
        // Initial condition: C = 0 everywhere (salt-free interior)
        this.C = new Float64Array(this.N).fill(0);
        
        // Reset state
        this.time = 0;
        this.stepCount = 0;
        this.history = { t: [], cCore: [], cAvg: [] };
        this._initialized = true;
        
        // Record initial state
        this._recordHistory();
    }
    
    /**
     * Build the diffusion coefficient profile D(x)
     * For 'control': D = D_water everywhere (rapid equilibration)
     * For 'hydrogelOnly': chitosan + hydrogel layers, then chamber
     * For 'fullHaloPod': all layers
     */
    _buildDiffusionProfile() {
        this.D = new Float64Array(this.N);
        this.layerMap = new Array(this.N);
        
        // Calculate cumulative layer boundaries
        const layerOrder = ['chitosan', 'hydrogel', 'biochar', 'chamber'];
        let cumulative = 0;
        this.layerBoundaries = [0];
        
        for (const layer of layerOrder) {
            cumulative += this.layers[layer];
            this.layerBoundaries.push(Math.min(cumulative, 1.0));
        }
        
        // Assign D values to each grid point
        for (let i = 0; i < this.N; i++) {
            const xPos = this.x[i];
            
            if (this.scenario === 'control') {
                // No capsule: water everywhere
                this.D[i] = this.diffCoeffs.water;
                this.layerMap[i] = 'water';
            } else if (this.scenario === 'hydrogelOnly') {
                // Only chitosan + hydrogel layers, no biochar
                if (xPos < this.layerBoundaries[1]) {
                    this.D[i] = this.diffCoeffs.chitosan;
                    this.layerMap[i] = 'chitosan';
                } else if (xPos < this.layerBoundaries[1] + this.layers.hydrogel) {
                    this.D[i] = this.diffCoeffs.hydrogel;
                    this.layerMap[i] = 'hydrogel';
                } else {
                    this.D[i] = this.diffCoeffs.chamber;
                    this.layerMap[i] = 'chamber';
                }
            } else {
                // Full HaloPod: all layers
                if (xPos < this.layerBoundaries[1]) {
                    this.D[i] = this.diffCoeffs.chitosan;
                    this.layerMap[i] = 'chitosan';
                } else if (xPos < this.layerBoundaries[2]) {
                    this.D[i] = this.diffCoeffs.hydrogel;
                    this.layerMap[i] = 'hydrogel';
                } else if (xPos < this.layerBoundaries[3]) {
                    this.D[i] = this.diffCoeffs.biochar;
                    this.layerMap[i] = 'biochar';
                } else {
                    this.D[i] = this.diffCoeffs.chamber;
                    this.layerMap[i] = 'chamber';
                }
            }
        }
    }
    
    /**
     * Get external salinity at time t
     */
    getExternalSalinity(t) {
        const p = this.salinityParams;
        switch (this.salinityType) {
            case 'constant':
                return p.level !== undefined ? p.level : 1.0;
            case 'tidal':
                // C_ext = base + amplitude * sin(2π * t / period)
                return (p.base || 0.5) + (p.amplitude || 0.3) * Math.sin(2 * Math.PI * t / (p.period || 0.25));
            case 'storm':
                // Normal level, then spike for a duration
                if (t >= (p.stormStart || 0.3) && t < (p.stormStart || 0.3) + (p.stormDuration || 0.15)) {
                    return p.stormPeak || 1.0;
                }
                return p.base || 0.4;
            case 'gradual':
                // Linear increase from start to end
                return (p.start || 0.2) + ((p.end || 1.0) - (p.start || 0.2)) * Math.min(t / this.totalTime, 1.0);
            default:
                return 1.0;
        }
    }
    
    /**
     * Advance simulation by one time step using explicit finite differences.
     * Uses conservative form with harmonic mean at interfaces.
     * 
     * C_i^{n+1} = C_i^n + dt/dx^2 * [D_{i+1/2}(C_{i+1} - C_i) - D_{i-1/2}(C_i - C_{i-1})]
     * 
     * where D_{i+1/2} = 2*D_i*D_{i+1} / (D_i + D_{i+1})  (harmonic mean)
     */
    step() {
        if (!this._initialized) this.initialize();
        if (this.time >= this.totalTime) return false;
        
        const N = this.N;
        const dx2 = this.dx * this.dx;
        const Cnew = new Float64Array(N);
        
        // Boundary condition at x=0: Dirichlet (external salinity)
        Cnew[0] = this.getExternalSalinity(this.time);
        
        // Interior points: conservative finite difference
        for (let i = 1; i < N - 1; i++) {
            // Harmonic mean of D at half-points
            const D_right = 2.0 * this.D[i] * this.D[i+1] / (this.D[i] + this.D[i+1]);
            const D_left  = 2.0 * this.D[i] * this.D[i-1] / (this.D[i] + this.D[i-1]);
            
            const flux = (this.dt / dx2) * (D_right * (this.C[i+1] - this.C[i]) - D_left * (this.C[i] - this.C[i-1]));
            Cnew[i] = this.C[i] + flux;
        }
        
        // Boundary condition at x=L: zero flux (Neumann, dC/dx = 0)
        Cnew[N-1] = Cnew[N-2];
        
        // Update state
        this.C = Cnew;
        this.time += this.dt;
        this.stepCount++;
        
        // Record history periodically (every ~100 steps or at completion)
        if (this.stepCount % Math.max(1, Math.floor(this.maxSteps / 500)) === 0 || this.time >= this.totalTime) {
            this._recordHistory();
        }
        
        return true;
    }
    
    /**
     * Run multiple steps (for batch computation)
     */
    runSteps(nSteps) {
        for (let i = 0; i < nSteps; i++) {
            if (!this.step()) return false;
        }
        return true;
    }
    
    /**
     * Run simulation to a target time
     */
    runToTime(targetTime) {
        const target = Math.min(targetTime, this.totalTime);
        while (this.time < target) {
            if (!this.step()) break;
        }
        this._recordHistory();
        return this.getState();
    }
    
    /**
     * Run complete simulation
     */
    runComplete() {
        while (this.time < this.totalTime && this.stepCount < this.maxSteps) {
            this.step();
        }
        this._recordHistory();
        return this.getState();
    }
    
    _recordHistory() {
        this.history.t.push(this.time);
        this.history.cCore.push(this.getCoreConcentration());
        this.history.cAvg.push(this._getAverageConcentration());
    }
    
    _getAverageConcentration() {
        let sum = 0;
        let count = 0;
        for (let i = 0; i < this.N; i++) {
            if (this.layerMap[i] === 'chamber' || (this.scenario === 'control' && i > this.N * 0.7)) {
                sum += this.C[i];
                count++;
            }
        }
        return count > 0 ? sum / count : 0;
    }
    
    /**
     * Get current concentration profile
     */
    getConcentrationProfile() {
        const profile = [];
        // Downsample for display (max 100 points)
        const step = Math.max(1, Math.floor(this.N / 100));
        for (let i = 0; i < this.N; i += step) {
            profile.push({ x: this.x[i], c: this.C[i], layer: this.layerMap[i] });
        }
        // Ensure last point is included
        if (profile[profile.length - 1].x !== this.x[this.N - 1]) {
            profile.push({ x: this.x[this.N-1], c: this.C[this.N-1], layer: this.layerMap[this.N-1] });
        }
        return profile;
    }
    
    /**
     * Get concentration at the propagule chamber (average of last 20% of domain)
     */
    getCoreConcentration() {
        const start = Math.floor(this.N * 0.85);
        let sum = 0;
        for (let i = start; i < this.N; i++) {
            sum += this.C[i];
        }
        return sum / (this.N - start);
    }
    
    /**
     * Get time history
     */
    getTimeHistory() {
        return { ...this.history };
    }
    
    /**
     * Get layer boundaries for visualization
     */
    getLayerBoundaries() {
        return [...this.layerBoundaries];
    }
    
    /**
     * Get full state
     */
    getState() {
        return {
            time: this.time,
            totalTime: this.totalTime,
            stepCount: this.stepCount,
            coreConcentration: this.getCoreConcentration(),
            profile: this.getConcentrationProfile(),
            history: this.getTimeHistory(),
            layerBoundaries: this.getLayerBoundaries(),
            isComplete: this.time >= this.totalTime,
            scenario: this.scenario,
            disclaimer: 'MODEL OUTPUT — Illustrative parameters, not experimentally validated'
        };
    }
    
    getCurrentTime() { return this.time; }
    isComplete() { return this.time >= this.totalTime; }
    
    /**
     * Reset simulation
     */
    reset() {
        this._initialized = false;
        this.initialize();
    }
    
    /**
     * Set scenario and reinitialize
     */
    setScenario(scenario) {
        this.scenario = scenario;
        this.reset();
    }
    
    setExternalSalinity(type, params) {
        this.salinityType = type;
        this.salinityParams = params || {};
    }
    
    setLayerThicknesses(chitosan, hydrogel, biochar, chamber) {
        // Normalize so they sum to 1
        const total = chitosan + hydrogel + biochar + chamber;
        this.layers.chitosan = chitosan / total;
        this.layers.hydrogel = hydrogel / total;
        this.layers.biochar = biochar / total;
        this.layers.chamber = chamber / total;
    }
    
    setDiffusionCoefficients(chitosan, hydrogel, biochar, chamber) {
        this.diffCoeffs.chitosan = chitosan;
        this.diffCoeffs.hydrogel = hydrogel;
        this.diffCoeffs.biochar = biochar;
        this.diffCoeffs.chamber = chamber;
    }
    
    /**
     * Run sensitivity analysis: vary one parameter while holding others constant
     * Returns array of {paramValue, timeToHalf, finalCore}
     */
    static runSensitivity(paramName, values, baseConfig = {}) {
        const results = [];
        for (const val of values) {
            const config = { ...baseConfig };
            switch (paramName) {
                case 'dHydrogel': config.dHydrogel = val; break;
                case 'dBiochar': config.dBiochar = val; break;
                case 'dChitosan': config.dChitosan = val; break;
                case 'hydrogelThickness': config.hydrogelThickness = val; break;
                case 'biocharThickness': config.biocharThickness = val; break;
                case 'chitosanThickness': config.chitosanThickness = val; break;
            }
            const sim = new DiffusionSimulation(config);
            sim.initialize();
            sim.runComplete();
            
            // Find time to reach 50% core concentration
            const hist = sim.getTimeHistory();
            let timeToHalf = hist.t[hist.t.length - 1]; // default: never reached
            for (let i = 0; i < hist.cCore.length; i++) {
                if (hist.cCore[i] >= 0.5) {
                    timeToHalf = hist.t[i];
                    break;
                }
            }
            
            results.push({
                paramValue: val,
                timeToHalf: timeToHalf,
                finalCore: sim.getCoreConcentration(),
                history: sim.getTimeHistory()
            });
        }
        return results;
    }
    
    /**
     * Run all three scenarios for comparison
     */
    static runComparison(config = {}) {
        const scenarios = ['control', 'hydrogelOnly', 'fullHaloPod'];
        const results = {};
        for (const sc of scenarios) {
            const sim = new DiffusionSimulation({ ...config, scenario: sc });
            sim.initialize();
            sim.runComplete();
            results[sc] = {
                history: sim.getTimeHistory(),
                finalCore: sim.getCoreConcentration(),
                profile: sim.getConcentrationProfile(),
                layerBoundaries: sim.getLayerBoundaries()
            };
        }
        return results;
    }
}

// Make available globally
if (typeof window !== 'undefined') window.DiffusionSimulation = DiffusionSimulation;
