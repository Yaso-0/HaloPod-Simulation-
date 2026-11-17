'use strict';

/**
 * HaloPod Virtual Lab Controller
 * Connects DiffusionSimulation, HaloChart, and UI
 * 6-step guided virtual experiment
 */
const VirtualLab = {
    _initialized: false,
    currentStep: 1,
    maxAccessibleStep: 1,
    simulation: null,
    animationId: null,
    isRunning: false,
    isPaused: false,
    speed: 1,
    stepsPerFrame: 50,
    savedResults: {},
    currentScenario: 'fullHaloPod',

    params: {
        chitosanThickness: 0.05,
        hydrogelThickness: 0.35,
        biocharThickness: 0.30,
        chamberThickness: 0.30,
        dChitosan: 0.3,
        dHydrogel: 0.5,
        dBiochar: 0.2,
        dChamber: 0.8,
        salinityType: 'constant',
        salinityParams: { level: 1.0 },
        totalTime: 1.0,
        scenario: 'fullHaloPod'
    },

    init() {
        if (this._initialized) return;
        this._initialized = true;
        this._initStepNavigation();
        this._initStep1();
        this._initStep2();
        this._initStep3();
        this._initStep4Controls();
        this._initStep5();
        this._initStep6();
        this.goToStep(1);
    },

    /* ===== STEP NAVIGATION ===== */
    _initStepNavigation() {
        document.querySelectorAll('.step-item').forEach(item => {
            item.addEventListener('click', () => {
                const s = parseInt(item.dataset.step);
                if (s <= this.maxAccessibleStep) this.goToStep(s);
            });
        });
        document.querySelectorAll('.btn-next-step').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.currentStep < 6) this.goToStep(this.currentStep + 1);
            });
        });
        document.querySelectorAll('.btn-prev-step').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.currentStep > 1) this.goToStep(this.currentStep - 1);
            });
        });
    },

    goToStep(n) {
        if (n > this.maxAccessibleStep + 1) return;
        if (n > this.maxAccessibleStep) this.maxAccessibleStep = n;
        this.currentStep = n;

        for (let i = 1; i <= 6; i++) {
            const el = document.getElementById('lab-step-' + i);
            if (el) el.style.display = (i === n) ? 'block' : 'none';
        }

        document.querySelectorAll('.step-item').forEach(item => {
            const s = parseInt(item.dataset.step);
            item.classList.remove('active', 'completed', 'disabled');
            if (s === n) item.classList.add('active');
            else if (s < n) item.classList.add('completed');
            else if (s <= this.maxAccessibleStep) item.classList.add('completed');
            else item.classList.add('disabled');
        });

        if (n === 5 && Object.keys(this.savedResults).length > 0) this._updateResultsCharts();
        if (n === 6) this._generateInterpretation();
    },

    /* ===== STEP 1: EXPLORE PROTOTYPE ===== */
    _initStep1() {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._updateCapsuleView(btn.dataset.view);
            });
        });
        document.querySelectorAll('.capsule-layer').forEach(layer => {
            layer.addEventListener('click', () => this._highlightLayer(layer.dataset.layer));
        });
        this._updateCapsuleView('assembled');
    },

    _updateCapsuleView(viewType) {
        document.querySelectorAll('.capsule-view-group').forEach(g => g.style.display = 'none');
        const target = document.getElementById('view-' + viewType);
        if (target) target.style.display = 'block';
    },

    _highlightLayer(layerName) {
        document.querySelectorAll('.capsule-layer').forEach(l => l.classList.remove('highlighted'));
        document.querySelectorAll('.layer-desc').forEach(d => d.classList.remove('active'));
        document.querySelectorAll('.capsule-layer[data-layer="' + layerName + '"]').forEach(l => l.classList.add('highlighted'));
        const desc = document.getElementById('desc-' + layerName);
        if (desc) desc.classList.add('active');
    },

    /* ===== STEP 2: CHOOSE DESIGN ===== */
    _initStep2() {
        document.querySelectorAll('input[name="scenario"]').forEach(radio => {
            radio.addEventListener('change', e => {
                this.currentScenario = e.target.value;
                this.params.scenario = e.target.value;
                document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
                e.target.closest('.radio-card').classList.add('selected');
                this._updateDesignVisibility();
            });
        });

        ['chitosan','hydrogel','biochar','chamber'].forEach(name => {
            const slider = document.getElementById('slider-' + name);
            const display = document.getElementById(name + '-value');
            if (slider) {
                slider.addEventListener('input', () => {
                    const v = parseFloat(slider.value);
                    if (display) display.textContent = v.toFixed(2);
                    this.params[name + 'Thickness'] = v;
                });
            }
        });

        ['chitosan','hydrogel','biochar','chamber'].forEach(name => {
            const slider = document.getElementById('slider-d-' + name);
            const display = document.getElementById('d-' + name + '-value');
            if (slider) {
                slider.addEventListener('input', () => {
                    const v = parseFloat(slider.value);
                    if (display) display.textContent = v.toFixed(2);
                    this.params['d' + name.charAt(0).toUpperCase() + name.slice(1)] = v;
                });
            }
        });

        this._updateDesignVisibility();
    },

    _updateDesignVisibility() {
        const isControl = this.currentScenario === 'control';
        document.querySelectorAll('.design-sliders').forEach(g => g.style.opacity = isControl ? '0.4' : '1');
    },

    /* ===== STEP 3: SET ENVIRONMENT ===== */
    _initStep3() {
        document.querySelectorAll('input[name="salinity-scenario"]').forEach(radio => {
            radio.addEventListener('change', e => {
                this.params.salinityType = e.target.value;
                document.querySelectorAll('.salinity-params').forEach(p => p.style.display = 'none');
                const tp = document.getElementById('params-' + e.target.value);
                if (tp) tp.style.display = 'block';
                document.querySelectorAll('.salinity-radio-card').forEach(c => c.classList.remove('selected'));
                e.target.closest('.salinity-radio-card').classList.add('selected');
                this._updateSalinityParams();
            });
        });

        const dur = document.getElementById('slider-duration');
        if (dur) {
            dur.addEventListener('input', () => {
                this.params.totalTime = parseFloat(dur.value);
                const d = document.getElementById('duration-value');
                if (d) d.textContent = parseFloat(dur.value).toFixed(1);
            });
        }
        document.querySelectorAll('.salinity-param-input').forEach(inp => {
            inp.addEventListener('input', () => {
                // Update the adjacent slider-value display
                const label = inp.closest('.slider-group')?.querySelector('.slider-value');
                if (label) label.textContent = parseFloat(inp.value).toFixed(2);
                this._updateSalinityParams();
            });
        });
    },

    _updateSalinityParams() {
        const type = this.params.salinityType;
        const p = {};
        const v = id => parseFloat(document.getElementById(id)?.value || 0);
        switch (type) {
            case 'constant': p.level = v('param-constant-level') || 1.0; break;
            case 'tidal': p.base = v('param-tidal-base')||0.5; p.amplitude = v('param-tidal-amp')||0.3; p.period = v('param-tidal-period')||0.25; break;
            case 'storm': p.base = v('param-storm-base')||0.4; p.stormPeak = v('param-storm-peak')||1.0; p.stormStart = v('param-storm-start')||0.3; p.stormDuration = v('param-storm-duration')||0.15; break;
            case 'gradual': p.start = v('param-gradual-start')||0.2; p.end = v('param-gradual-end')||1.0; break;
        }
        this.params.salinityParams = p;
    },

    /* ===== STEP 4: RUN EXPERIMENT ===== */
    _initStep4Controls() {
        const start = document.getElementById('btn-start');
        const pause = document.getElementById('btn-pause');
        const reset = document.getElementById('btn-reset');
        if (start) start.addEventListener('click', () => this.startSimulation());
        if (pause) pause.addEventListener('click', () => this.togglePause());
        if (reset) reset.addEventListener('click', () => this.resetSimulation());

        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.speed = parseInt(btn.dataset.speed);
                this.stepsPerFrame = 50 * this.speed;
            });
        });
    },

    startSimulation() {
        this.simulation = new DiffusionSimulation({
            scenario: this.params.scenario,
            dChitosan: this.params.dChitosan, dHydrogel: this.params.dHydrogel,
            dBiochar: this.params.dBiochar, dChamber: this.params.dChamber,
            chitosanThickness: this.params.chitosanThickness, hydrogelThickness: this.params.hydrogelThickness,
            biocharThickness: this.params.biocharThickness, chamberThickness: this.params.chamberThickness,
            salinityType: this.params.salinityType, salinityParams: this.params.salinityParams,
            totalTime: this.params.totalTime
        });
        this.simulation.initialize();
        this.isRunning = true;
        this.isPaused = false;

        const start = document.getElementById('btn-start');
        const pause = document.getElementById('btn-pause');
        if (start) start.disabled = true;
        if (pause) { pause.disabled = false; pause.textContent = 'Pause'; }
        this._animationLoop();
    },

    togglePause() {
        this.isPaused = !this.isPaused;
        const pause = document.getElementById('btn-pause');
        if (pause) pause.textContent = this.isPaused ? 'Resume' : 'Pause';
        if (!this.isPaused && this.isRunning) this._animationLoop();
    },

    resetSimulation() {
        this.isRunning = false; this.isPaused = false;
        if (this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; }
        const start = document.getElementById('btn-start');
        const pause = document.getElementById('btn-pause');
        if (start) { start.disabled = false; start.textContent = '▶ Start Simulation'; }
        if (pause) { pause.disabled = true; pause.textContent = 'Pause'; }
        const lp = document.getElementById('chart-live-profile');
        const lc = document.getElementById('chart-live-core');
        if (lp) lp.innerHTML = '<p class="chart-placeholder">Run simulation to see results</p>';
        if (lc) lc.innerHTML = '<p class="chart-placeholder">Run simulation to see results</p>';
        const td = document.getElementById('sim-time-display');
        if (td) td.textContent = 't = 0.000';
    },

    _animationLoop() {
        if (!this.isRunning || this.isPaused) return;
        const still = this.simulation.runSteps(this.stepsPerFrame);

        const td = document.getElementById('sim-time-display');
        if (td) {
            const pct = (this.simulation.getCurrentTime() / this.params.totalTime * 100).toFixed(1);
            td.textContent = 't = ' + this.simulation.getCurrentTime().toFixed(3) + ' (' + pct + '%)';
        }

        this._updateSimVisualization();
        if (this.simulation.stepCount % (this.stepsPerFrame * 3) < this.stepsPerFrame) {
            this._updateLiveCharts();
        }

        if (!still || this.simulation.isComplete()) {
            this.isRunning = false;
            this._updateLiveCharts();
            this._onSimulationComplete();
            return;
        }
        this.animationId = requestAnimationFrame(() => this._animationLoop());
    },

    _updateSimVisualization() {
        const layers = document.querySelectorAll('#capsule-sim-svg .sim-layer');
        if (layers.length === 0 || !this.simulation) return;
        const profile = this.simulation.getConcentrationProfile();
        const layerAvgs = {};
        for (const p of profile) {
            if (!layerAvgs[p.layer]) layerAvgs[p.layer] = { sum: 0, n: 0 };
            layerAvgs[p.layer].sum += p.c;
            layerAvgs[p.layer].n++;
        }
        layers.forEach(el => {
            const name = el.dataset.layer;
            const avg = layerAvgs[name] ? layerAvgs[name].sum / layerAvgs[name].n : 0;
            const r = Math.round(200 + avg * 55);
            const g = Math.round(220 - avg * 120);
            const b = Math.round(220 - avg * 120);
            el.style.fill = 'rgb(' + r + ',' + g + ',' + b + ')';
        });
    },

    _updateLiveCharts() {
        if (!this.simulation || typeof HaloChart === 'undefined') return;
        const profile = this.simulation.getConcentrationProfile();
        const history = this.simulation.getTimeHistory();
        const boundaries = this.simulation.getLayerBoundaries();

        const pc = document.getElementById('chart-live-profile');
        if (pc) {
            HaloChart.profileChart(pc, {
                title: 'Concentration Profile Across Capsule',
                xLabel: 'Normalized Position (x/L)',
                yLabel: 'Normalized Concentration (C/C\u2080)',
                series: [{ name: 'Current', data: profile.map(p => ({ x: p.x, y: p.c })), color: '#1a5c5e' }],
                layerBoundaries: boundaries, yRange: [0, 1.1]
            });
        }
        const cc = document.getElementById('chart-live-core');
        if (cc) {
            HaloChart.lineChart(cc, {
                title: 'Core Concentration Over Time',
                xLabel: 'Normalized Time', yLabel: 'Core C/C\u2080',
                series: [{ name: 'Core', data: history.t.map((t, i) => ({ x: t, y: history.cCore[i] })), color: '#1a5c5e' }],
                yRange: [0, 1.1], showLegend: false
            });
        }
    },

    _onSimulationComplete() {
        const key = this.params.scenario;
        this.savedResults[key] = {
            history: this.simulation.getTimeHistory(),
            profile: this.simulation.getConcentrationProfile(),
            finalCore: this.simulation.getCoreConcentration(),
            boundaries: this.simulation.getLayerBoundaries(),
            params: { ...this.params }
        };
        this.maxAccessibleStep = 6;
        const start = document.getElementById('btn-start');
        if (start) { start.disabled = false; start.textContent = '▶ Run Again'; }
        document.querySelectorAll('.step-item').forEach(item => {
            const s = parseInt(item.dataset.step);
            if (s <= this.maxAccessibleStep) item.classList.remove('disabled');
        });
        const td = document.getElementById('sim-time-display');
        if (td) td.textContent += ' — Complete \u2713';
    },

    /* ===== STEP 5: ANALYZE RESULTS ===== */
    _initStep5() {
        const comp = document.getElementById('btn-run-comparison');
        if (comp) comp.addEventListener('click', () => this._runComparison());
        const sens = document.getElementById('btn-run-sensitivity');
        if (sens) sens.addEventListener('click', () => this._runSensitivity());
    },

    _updateResultsCharts() {
        const data = this.savedResults[this.params.scenario];
        if (!data) return;
        const fp = document.getElementById('chart-final-profile');
        if (fp && typeof HaloChart !== 'undefined') {
            HaloChart.profileChart(fp, {
                title: 'Final Concentration Profile', xLabel: 'Position (x/L)', yLabel: 'C/C\u2080',
                series: [{ name: this._label(this.params.scenario), data: data.profile.map(p => ({ x: p.x, y: p.c })), color: '#1a5c5e' }],
                layerBoundaries: data.boundaries, yRange: [0, 1.1]
            });
        }
        this._updateResultsTable();
    },

    _runComparison() {
        const el = document.getElementById('chart-comparison');
        if (!el) return;
        el.innerHTML = '<p class="chart-placeholder">Computing...</p>';
        setTimeout(() => {
            const cmp = DiffusionSimulation.runComparison({
                dChitosan: this.params.dChitosan, dHydrogel: this.params.dHydrogel,
                dBiochar: this.params.dBiochar, dChamber: this.params.dChamber,
                chitosanThickness: this.params.chitosanThickness, hydrogelThickness: this.params.hydrogelThickness,
                biocharThickness: this.params.biocharThickness, chamberThickness: this.params.chamberThickness,
                salinityType: this.params.salinityType, salinityParams: this.params.salinityParams,
                totalTime: this.params.totalTime
            });
            const colors = { control: '#95a5a6', hydrogelOnly: '#2d8f8f', fullHaloPod: '#1a5c5e' };
            const dashes = { control: true, hydrogelOnly: false, fullHaloPod: false };
            const series = Object.entries(cmp).map(([k, d]) => ({
                name: this._label(k), color: colors[k], dash: dashes[k],
                data: d.history.t.map((t, i) => ({ x: t, y: d.history.cCore[i] }))
            }));
            HaloChart.lineChart(el, {
                title: 'Scenario Comparison — Core Concentration',
                xLabel: 'Normalized Time', yLabel: 'Core C/C\u2080',
                series, yRange: [0, 1.1]
            });
            const bar = document.getElementById('chart-comparison-bar');
            if (bar) {
                HaloChart.barChart(bar, {
                    title: 'Final Core Concentration by Scenario',
                    xLabel: 'Scenario', yLabel: 'Final C/C\u2080',
                    categories: ['Control', 'Hydrogel Only', 'Full HaloPod'],
                    series: [{ name: 'Final C/C\u2080', values: [cmp.control.finalCore, cmp.hydrogelOnly.finalCore, cmp.fullHaloPod.finalCore], color: '#2d8f8f' }]
                });
            }
        }, 50);
    },

    _runSensitivity() {
        const el = document.getElementById('chart-sensitivity');
        if (!el) return;
        el.innerHTML = '<p class="chart-placeholder">Computing...</p>';
        setTimeout(() => {
            const base = { scenario: 'fullHaloPod', ...this.params };
            const vals = [0.05, 0.1, 0.2, 0.3, 0.5, 0.8];
            const res = DiffusionSimulation.runSensitivity('dHydrogel', vals, base);
            const colors = HaloChart.defaultSeriesColors;
            HaloChart.lineChart(el, {
                title: 'Sensitivity: Hydrogel Diffusion Coefficient',
                xLabel: 'Normalized Time', yLabel: 'Core C/C\u2080',
                series: res.map((r, i) => ({
                    name: 'D_hyd=' + r.paramValue, color: colors[i % colors.length],
                    data: r.history.t.map((t, j) => ({ x: t, y: r.history.cCore[j] }))
                })), yRange: [0, 1.1]
            });
            const el2 = document.getElementById('chart-sensitivity-biochar');
            if (el2) {
                const res2 = DiffusionSimulation.runSensitivity('dBiochar', vals, base);
                HaloChart.lineChart(el2, {
                    title: 'Sensitivity: Biochar Diffusion Coefficient',
                    xLabel: 'Normalized Time', yLabel: 'Core C/C\u2080',
                    series: res2.map((r, i) => ({
                        name: 'D_bio=' + r.paramValue, color: colors[i % colors.length],
                        data: r.history.t.map((t, j) => ({ x: t, y: r.history.cCore[j] }))
                    })), yRange: [0, 1.1]
                });
            }
        }, 50);
    },

    _updateResultsTable() {
        const tbody = document.querySelector('#results-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        for (const [sc, data] of Object.entries(this.savedResults)) {
            const h = data.history;
            let t50 = 'N/A';
            for (let i = 0; i < h.cCore.length; i++) { if (h.cCore[i] >= 0.5) { t50 = h.t[i].toFixed(3); break; } }
            const tr = document.createElement('tr');
            tr.innerHTML = '<td>' + this._label(sc) + '</td><td>' + data.finalCore.toFixed(4) + '</td><td>' + t50 + '</td><td>' + h.t[h.t.length-1].toFixed(3) + '</td>';
            tbody.appendChild(tr);
        }
    },

    _label(key) {
        return { control: 'No Capsule (Control)', hydrogelOnly: 'Hydrogel Only', fullHaloPod: 'Full HaloPod' }[key] || key;
    },

    /* ===== STEP 6: UNDERSTAND ===== */
    _initStep6() {
        const dl = document.getElementById('btn-download-summary');
        if (dl) dl.addEventListener('click', () => this._downloadSummary());
        const ne = document.getElementById('btn-new-experiment');
        if (ne) ne.addEventListener('click', () => {
            this.savedResults = {};
            this.maxAccessibleStep = 1;
            this.resetSimulation();
            this.goToStep(1);
        });
    },

    _generateInterpretation() {
        const el = document.getElementById('interpretation-content');
        if (!el) return;
        if (Object.keys(this.savedResults).length === 0) {
            el.innerHTML = '<p>Run at least one simulation to see interpretation.</p>';
            return;
        }
        let h = '<div class="interpretation-section">';
        h += '<h4>What happened in your experiment</h4>';
        for (const [sc, d] of Object.entries(this.savedResults)) {
            h += '<p><strong>' + this._label(sc) + ':</strong> Core concentration reached ' + (d.finalCore*100).toFixed(1) + '% of external salinity by simulation end.</p>';
        }
        const keys = Object.keys(this.savedResults);
        if (keys.length > 1) {
            h += '<h4>Comparison</h4>';
            const sorted = keys.sort((a,b) => this.savedResults[a].finalCore - this.savedResults[b].finalCore);
            h += '<p>The <strong>' + this._label(sorted[0]) + '</strong> scenario showed the lowest final core concentration (' + (this.savedResults[sorted[0]].finalCore*100).toFixed(1) + '%), suggesting slowest ion ingress in the model.</p>';
        }
        h += '<h4>What the model suggests</h4><ul>';
        h += '<li>Layers with lower diffusion coefficients slow transport toward the propagule chamber.</li>';
        h += '<li>Thicker barrier layers generally delay equilibration.</li>';
        h += '<li>The biochar composite layer, when assigned a lower D value, provides additional diffusion resistance.</li></ul>';
        h += '<h4>What the model cannot determine</h4><ul>';
        h += '<li>Whether assumed diffusion coefficients reflect real material properties.</li>';
        h += '<li>Whether reduced ion ingress translates to improved germination or survival.</li>';
        h += '<li>Effects of hydrogel swelling, biodegradation, or biological interactions.</li>';
        h += '<li>Actual Na\u207a or Cl\u207b concentrations — only normalized values are modeled.</li></ul>';
        h += '<h4>Recommended next steps</h4><ol>';
        h += '<li>Fabricate capsules and measure actual diffusion coefficients.</li>';
        h += '<li>Conduct swelling tests at multiple salinity levels.</li>';
        h += '<li>Measure ion transport through the capsule wall over time.</li>';
        h += '<li>Test mechanical stability and biodegradation rate.</li>';
        h += '<li>Run germination trials with mangrove propagules at controlled salinities.</li></ol></div>';
        el.innerHTML = h;
    },

    _downloadSummary() {
        let t = 'HALOPOD VIRTUAL EXPERIMENT SUMMARY\n' + '='.repeat(50) + '\n';
        t += 'Generated: ' + new Date().toISOString() + '\n\n';
        t += 'DISCLAIMER: All results are model outputs using illustrative parameters.\nNo experimental validation has been conducted.\n\n';
        t += 'PARAMETERS\n' + '-'.repeat(30) + '\n';
        t += 'Scenario: ' + this._label(this.params.scenario) + '\n';
        t += 'Salinity type: ' + this.params.salinityType + '\n';
        t += 'D_chitosan: ' + this.params.dChitosan + ' (illustrative)\n';
        t += 'D_hydrogel: ' + this.params.dHydrogel + ' (illustrative)\n';
        t += 'D_biochar: ' + this.params.dBiochar + ' (illustrative)\n';
        t += 'D_chamber: ' + this.params.dChamber + ' (illustrative)\n\n';
        t += 'RESULTS\n' + '-'.repeat(30) + '\n';
        for (const [sc, d] of Object.entries(this.savedResults)) {
            t += this._label(sc) + ': Final core = ' + d.finalCore.toFixed(4) + '\n';
        }
        t += '\nThis summary is for educational and research purposes only.\n';
        const blob = new Blob([t], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'HaloPod_Experiment_Summary.txt'; a.click();
        URL.revokeObjectURL(url);
    }
};

if (typeof window !== 'undefined') window.VirtualLab = VirtualLab;
