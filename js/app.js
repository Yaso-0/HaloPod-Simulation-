'use strict';

/**
 * HaloPod Digital Research Platform — Application Controller
 */
const App = {
    currentPage: 'home',
    
    init() {
        this.navigation.init();
        this.router.init();
        this.animations.init();
        this.tooltips.init();
        this.tabs.init();
        
        // Initialize KaTeX if available
        setTimeout(() => {
            if (typeof renderMathInElement !== 'undefined') {
                renderMathInElement(document.body, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '\\(', right: '\\)', display: false }
                    ],
                    throwOnError: false
                });
            }
        }, 500);
    },
    
    router: {
        init() {
            window.addEventListener('hashchange', () => this.navigate());
            this.navigate();
        },
        
        navigate() {
            const hash = window.location.hash.slice(1) || 'home';
            const pages = document.querySelectorAll('.page');
            pages.forEach(p => p.classList.remove('active'));
            
            const target = document.getElementById(hash);
            if (target) {
                target.classList.add('active');
                App.currentPage = hash;
            } else {
                const home = document.getElementById('home');
                if (home) home.classList.add('active');
                App.currentPage = 'home';
            }
            
            // Update nav
            App.navigation.updateActive(App.currentPage);
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'instant' });
            
            // Close mobile menu
            App.navigation.closeMobile();
            
            // Re-trigger animations
            setTimeout(() => App.animations.check(), 100);
            
            // Initialize virtual lab if entering simulation page
            if (App.currentPage === 'simulation' && typeof VirtualLab !== 'undefined' && !VirtualLab._initialized) {
                VirtualLab.init();
            }
            
            // Re-render math
            if (typeof renderMathInElement !== 'undefined') {
                setTimeout(() => {
                    renderMathInElement(document.body, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '\\(', right: '\\)', display: false }
                        ],
                        throwOnError: false
                    });
                }, 200);
            }
            
            // Generate results page charts if needed
            if (App.currentPage === 'results' && typeof VirtualLab !== 'undefined') {
                setTimeout(() => {
                    if (typeof generateResultsPageCharts === 'function') generateResultsPageCharts();
                }, 300);
            }
        }
    },
    
    navigation: {
        init() {
            const toggle = document.querySelector('.nav-toggle');
            const mobileNav = document.querySelector('.nav-mobile');
            
            if (toggle) {
                toggle.addEventListener('click', () => {
                    mobileNav.classList.toggle('open');
                    toggle.classList.toggle('open');
                });
            }
            
            // Close mobile menu on link click
            document.querySelectorAll('.nav-mobile .nav-link').forEach(link => {
                link.addEventListener('click', () => this.closeMobile());
            });
        },
        
        updateActive(page) {
            document.querySelectorAll('.nav-link').forEach(link => {
                const href = link.getAttribute('href');
                if (href === '#' + page) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        },
        
        closeMobile() {
            const mobileNav = document.querySelector('.nav-mobile');
            const toggle = document.querySelector('.nav-toggle');
            if (mobileNav) mobileNav.classList.remove('open');
            if (toggle) toggle.classList.remove('open');
        }
    },
    
    animations: {
        observer: null,
        
        init() {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
            
            this.observe();
        },
        
        observe() {
            document.querySelectorAll('.reveal').forEach(el => {
                this.observer.observe(el);
            });
        },
        
        check() {
            document.querySelectorAll('.reveal').forEach(el => {
                this.observer.observe(el);
            });
        }
    },
    
    tooltips: {
        init() {
            // Tooltip elements are handled via CSS ::after pseudo-element
            // using data-tooltip attribute. No JS needed for basic functionality.
        }
    },
    
    tabs: {
        init() {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const group = btn.closest('.tab-group');
                    if (!group) return;
                    
                    const target = btn.dataset.tab;
                    
                    // Deactivate all tabs in group
                    group.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    group.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                    
                    // Activate clicked tab
                    btn.classList.add('active');
                    const panel = group.querySelector(`[data-panel="${target}"]`);
                    if (panel) panel.classList.add('active');
                });
            });
        }
    }
};

/**
 * Generate charts for the Results & Discussion page
 */
function generateResultsPageCharts() {
    if (typeof DiffusionSimulation === 'undefined' || typeof HaloChart === 'undefined') return;
    
    const container1 = document.getElementById('results-comparison-chart');
    const container2 = document.getElementById('results-sensitivity-chart');
    
    if (container1 && !container1.querySelector('svg')) {
        // Run comparison
        const comparison = DiffusionSimulation.runComparison();
        
        const series = [];
        const scenarioNames = { control: 'No Capsule (Control)', hydrogelOnly: 'Hydrogel Only', fullHaloPod: 'Full HaloPod' };
        const scenarioColors = { control: '#95a5a6', hydrogelOnly: '#2d8f8f', fullHaloPod: '#1a5c5e' };
        const scenarioDash = { control: true, hydrogelOnly: false, fullHaloPod: false };
        
        for (const [key, data] of Object.entries(comparison)) {
            series.push({
                name: scenarioNames[key],
                data: data.history.t.map((t, i) => ({ x: t, y: data.history.cCore[i] })),
                color: scenarioColors[key],
                dash: scenarioDash[key]
            });
        }
        
        HaloChart.lineChart(container1, {
            title: 'Core Concentration Over Time — Scenario Comparison',
            xLabel: 'Normalized Time',
            yLabel: 'Normalized Concentration (C/C₀)',
            series: series,
            yRange: [0, 1.1]
        });
    }
    
    if (container2 && !container2.querySelector('svg')) {
        // Sensitivity on hydrogel D
        const values = [0.1, 0.2, 0.3, 0.5, 0.7, 1.0];
        const sensResults = DiffusionSimulation.runSensitivity('dHydrogel', values, { scenario: 'fullHaloPod' });
        
        const series = sensResults.map((r, i) => ({
            name: `D_hyd = ${r.paramValue}`,
            data: r.history.t.map((t, j) => ({ x: t, y: r.history.cCore[j] })),
            color: HaloChart.defaultSeriesColors[i % HaloChart.defaultSeriesColors.length]
        }));
        
        HaloChart.lineChart(container2, {
            title: 'Sensitivity: Hydrogel Diffusion Coefficient',
            xLabel: 'Normalized Time',
            yLabel: 'Core Concentration (C/C₀)',
            series: series,
            yRange: [0, 1.1]
        });
    }
}

document.addEventListener('DOMContentLoaded', () => App.init());
