'use strict';

/**
 * HaloChart — Lightweight SVG charting for scientific data visualization
 * Custom-built for the HaloPod Digital Research Platform
 */
const HaloChart = {
    // Color palette
    colors: {
        primary: '#1a5c5e',
        teal: '#2d8f8f',
        lightTeal: '#7ec8c8',
        green: '#3a7d44',
        sand: '#d4b896',
        navy: '#1a3a4a',
        red: '#c0392b',
        gray: '#95a5a6',
        lightGray: '#ecf0f1',
        gridLine: '#e0e0e0',
        text: '#2c3e50',
        textLight: '#7f8c8d'
    },
    
    defaultSeriesColors: ['#1a5c5e', '#2d8f8f', '#3a7d44', '#d4b896', '#c0392b', '#7ec8c8'],
    
    // SVG namespace
    ns: 'http://www.w3.org/2000/svg',
    
    /**
     * Create an SVG element with attributes
     */
    _svgEl(tag, attrs = {}) {
        const el = document.createElementNS(this.ns, tag);
        for (const [k, v] of Object.entries(attrs)) {
            el.setAttribute(k, v);
        }
        return el;
    },
    
    /**
     * Calculate nice axis ticks
     */
    _niceScale(min, max, maxTicks = 8) {
        if (min === max) { min -= 0.5; max += 0.5; }
        const range = max - min;
        const roughStep = range / maxTicks;
        const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
        const residual = roughStep / mag;
        let niceStep;
        if (residual <= 1.5) niceStep = 1 * mag;
        else if (residual <= 3) niceStep = 2 * mag;
        else if (residual <= 7) niceStep = 5 * mag;
        else niceStep = 10 * mag;
        
        const niceMin = Math.floor(min / niceStep) * niceStep;
        const niceMax = Math.ceil(max / niceStep) * niceStep;
        const ticks = [];
        for (let v = niceMin; v <= niceMax + niceStep * 0.001; v += niceStep) {
            ticks.push(Math.round(v * 1e10) / 1e10);
        }
        return { min: niceMin, max: niceMax, step: niceStep, ticks };
    },
    
    /**
     * Format number for display
     */
    _formatNum(n) {
        if (Math.abs(n) >= 1000) return n.toFixed(0);
        if (Math.abs(n) >= 1) return n.toFixed(2);
        if (Math.abs(n) >= 0.01) return n.toFixed(3);
        if (n === 0) return '0';
        return n.toExponential(1);
    },
    
    /**
     * LINE CHART
     * config: { title, xLabel, yLabel, series: [{name, data:[{x,y}], color?, dash?}], xRange?, yRange?, width?, height?, showLegend? }
     */
    lineChart(container, config) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        container.innerHTML = '';
        
        const W = config.width || 700;
        const H = config.height || 400;
        const margin = { top: 50, right: 30, bottom: 60, left: 70 };
        if (config.showLegend !== false && config.series && config.series.length > 1) margin.right = 160;
        const plotW = W - margin.left - margin.right;
        const plotH = H - margin.top - margin.bottom;
        
        const svg = this._svgEl('svg', {
            viewBox: `0 0 ${W} ${H}`,
            preserveAspectRatio: 'xMidYMid meet',
            style: 'width:100%;height:auto;max-height:450px;font-family:Inter,system-ui,sans-serif;'
        });
        
        // Find data ranges
        let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
        for (const s of (config.series || [])) {
            for (const p of (s.data || [])) {
                if (p.x < xMin) xMin = p.x;
                if (p.x > xMax) xMax = p.x;
                if (p.y < yMin) yMin = p.y;
                if (p.y > yMax) yMax = p.y;
            }
        }
        if (config.xRange) { xMin = config.xRange[0]; xMax = config.xRange[1]; }
        if (config.yRange) { yMin = config.yRange[0]; yMax = config.yRange[1]; }
        if (yMin > 0) yMin = 0;
        
        const xScale = this._niceScale(xMin, xMax, 8);
        const yScale = this._niceScale(yMin, yMax, 6);
        
        const toX = x => margin.left + (x - xScale.min) / (xScale.max - xScale.min) * plotW;
        const toY = y => margin.top + plotH - (y - yScale.min) / (yScale.max - yScale.min) * plotH;
        
        // Background
        svg.appendChild(this._svgEl('rect', {
            x: margin.left, y: margin.top, width: plotW, height: plotH,
            fill: '#fafbfc', stroke: '#e0e0e0', 'stroke-width': '1'
        }));
        
        // Grid lines
        for (const tick of yScale.ticks) {
            const y = toY(tick);
            svg.appendChild(this._svgEl('line', {
                x1: margin.left, y1: y, x2: margin.left + plotW, y2: y,
                stroke: this.colors.gridLine, 'stroke-width': '1', 'stroke-dasharray': '3,3'
            }));
            const label = this._svgEl('text', {
                x: margin.left - 10, y: y + 4,
                'text-anchor': 'end', 'font-size': '11', fill: this.colors.textLight
            });
            label.textContent = this._formatNum(tick);
            svg.appendChild(label);
        }
        for (const tick of xScale.ticks) {
            const x = toX(tick);
            svg.appendChild(this._svgEl('line', {
                x1: x, y1: margin.top, x2: x, y2: margin.top + plotH,
                stroke: this.colors.gridLine, 'stroke-width': '1', 'stroke-dasharray': '3,3'
            }));
            const label = this._svgEl('text', {
                x: x, y: margin.top + plotH + 20,
                'text-anchor': 'middle', 'font-size': '11', fill: this.colors.textLight
            });
            label.textContent = this._formatNum(tick);
            svg.appendChild(label);
        }
        
        // Data lines
        const seriesArr = config.series || [];
        seriesArr.forEach((s, si) => {
            if (!s.data || s.data.length === 0) return;
            const color = s.color || this.defaultSeriesColors[si % this.defaultSeriesColors.length];
            const pts = s.data.map(p => `${toX(p.x)},${toY(p.y)}`).join(' ');
            const line = this._svgEl('polyline', {
                points: pts, fill: 'none', stroke: color, 'stroke-width': '2.5',
                'stroke-linejoin': 'round', 'stroke-linecap': 'round'
            });
            if (s.dash) line.setAttribute('stroke-dasharray', '8,4');
            svg.appendChild(line);
        });
        
        // Axes
        svg.appendChild(this._svgEl('line', {
            x1: margin.left, y1: margin.top + plotH, x2: margin.left + plotW, y2: margin.top + plotH,
            stroke: this.colors.text, 'stroke-width': '2'
        }));
        svg.appendChild(this._svgEl('line', {
            x1: margin.left, y1: margin.top, x2: margin.left, y2: margin.top + plotH,
            stroke: this.colors.text, 'stroke-width': '2'
        }));
        
        // Axis labels
        if (config.xLabel) {
            const xl = this._svgEl('text', {
                x: margin.left + plotW / 2, y: H - 10,
                'text-anchor': 'middle', 'font-size': '13', 'font-weight': '600', fill: this.colors.text
            });
            xl.textContent = config.xLabel;
            svg.appendChild(xl);
        }
        if (config.yLabel) {
            const yl = this._svgEl('text', {
                x: 15, y: margin.top + plotH / 2,
                'text-anchor': 'middle', 'font-size': '13', 'font-weight': '600', fill: this.colors.text,
                transform: `rotate(-90, 15, ${margin.top + plotH / 2})`
            });
            yl.textContent = config.yLabel;
            svg.appendChild(yl);
        }
        
        // Title
        if (config.title) {
            const t = this._svgEl('text', {
                x: margin.left + plotW / 2, y: 25,
                'text-anchor': 'middle', 'font-size': '15', 'font-weight': '700', fill: this.colors.text
            });
            t.textContent = config.title;
            svg.appendChild(t);
        }
        
        // Legend
        if (config.showLegend !== false && seriesArr.length > 1) {
            const lx = margin.left + plotW + 15;
            let ly = margin.top + 10;
            seriesArr.forEach((s, si) => {
                const color = s.color || this.defaultSeriesColors[si % this.defaultSeriesColors.length];
                const line = this._svgEl('line', {
                    x1: lx, y1: ly + 6, x2: lx + 25, y2: ly + 6,
                    stroke: color, 'stroke-width': '3'
                });
                if (s.dash) line.setAttribute('stroke-dasharray', '6,3');
                svg.appendChild(line);
                const label = this._svgEl('text', {
                    x: lx + 30, y: ly + 10,
                    'font-size': '11', fill: this.colors.text
                });
                label.textContent = s.name || `Series ${si + 1}`;
                svg.appendChild(label);
                ly += 22;
            });
        }
        
        // Tooltip line + circle (interactive)
        const tooltipGroup = this._svgEl('g', { style: 'display:none' });
        const tooltipLine = this._svgEl('line', {
            x1: 0, y1: margin.top, x2: 0, y2: margin.top + plotH,
            stroke: '#666', 'stroke-width': '1', 'stroke-dasharray': '4,2'
        });
        tooltipGroup.appendChild(tooltipLine);
        const tooltipBg = this._svgEl('rect', {
            rx: '4', ry: '4', fill: 'rgba(0,0,0,0.8)', width: '120', height: '50'
        });
        tooltipGroup.appendChild(tooltipBg);
        const tooltipText = this._svgEl('text', { fill: 'white', 'font-size': '11' });
        tooltipGroup.appendChild(tooltipText);
        svg.appendChild(tooltipGroup);
        
        // Mouse interaction
        const overlay = this._svgEl('rect', {
            x: margin.left, y: margin.top, width: plotW, height: plotH,
            fill: 'transparent', style: 'cursor:crosshair'
        });
        overlay.addEventListener('mousemove', (e) => {
            const rect = svg.getBoundingClientRect();
            const svgX = (e.clientX - rect.left) / rect.width * W;
            const dataX = xScale.min + (svgX - margin.left) / plotW * (xScale.max - xScale.min);
            
            tooltipGroup.style.display = '';
            tooltipLine.setAttribute('x1', svgX);
            tooltipLine.setAttribute('x2', svgX);
            
            let tooltipContent = `x: ${this._formatNum(dataX)}`;
            seriesArr.forEach((s, si) => {
                if (!s.data || s.data.length === 0) return;
                // Find nearest point
                let nearest = s.data[0];
                let minDist = Math.abs(s.data[0].x - dataX);
                for (const p of s.data) {
                    const dist = Math.abs(p.x - dataX);
                    if (dist < minDist) { minDist = dist; nearest = p; }
                }
                tooltipContent += `\n${s.name || 'S' + si}: ${this._formatNum(nearest.y)}`;
            });
            
            // Position tooltip
            tooltipText.textContent = '';
            const lines = tooltipContent.split('\n');
            const lineH = 14;
            const boxH = lines.length * lineH + 10;
            const boxW = 130;
            let tx = svgX + 10;
            let ty = margin.top + 10;
            if (tx + boxW > W) tx = svgX - boxW - 10;
            
            tooltipBg.setAttribute('x', tx);
            tooltipBg.setAttribute('y', ty);
            tooltipBg.setAttribute('width', boxW);
            tooltipBg.setAttribute('height', boxH);
            
            lines.forEach((line, li) => {
                const tspan = this._svgEl('tspan', {
                    x: tx + 8, dy: li === 0 ? (ty + lineH + 2) + '' : lineH + '',
                    'font-size': '10', fill: 'white'
                });
                // Fix: set y for first tspan
                if (li === 0) {
                    tspan.removeAttribute('dy');
                    tspan.setAttribute('y', ty + lineH);
                }
                tspan.textContent = line;
                tooltipText.appendChild(tspan);
            });
        });
        overlay.addEventListener('mouseleave', () => { tooltipGroup.style.display = 'none'; });
        svg.appendChild(overlay);
        
        container.appendChild(svg);
        return svg;
    },
    
    /**
     * BAR CHART
     * config: { title, xLabel, yLabel, categories:[], series:[{name, values:[], color}], width?, height? }
     */
    barChart(container, config) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        container.innerHTML = '';
        
        const W = config.width || 600;
        const H = config.height || 400;
        const margin = { top: 50, right: 140, bottom: 60, left: 70 };
        const plotW = W - margin.left - margin.right;
        const plotH = H - margin.top - margin.bottom;
        
        const svg = this._svgEl('svg', {
            viewBox: `0 0 ${W} ${H}`,
            preserveAspectRatio: 'xMidYMid meet',
            style: 'width:100%;height:auto;max-height:450px;font-family:Inter,system-ui,sans-serif;'
        });
        
        const categories = config.categories || [];
        const series = config.series || [];
        const nGroups = categories.length;
        const nSeries = series.length;
        
        // Find y range
        let yMax = 0;
        for (const s of series) {
            for (const v of (s.values || [])) {
                if (v > yMax) yMax = v;
            }
        }
        const yScale = this._niceScale(0, yMax, 6);
        const toY = y => margin.top + plotH - (y - yScale.min) / (yScale.max - yScale.min) * plotH;
        
        // Background & grid
        svg.appendChild(this._svgEl('rect', {
            x: margin.left, y: margin.top, width: plotW, height: plotH,
            fill: '#fafbfc', stroke: '#e0e0e0', 'stroke-width': '1'
        }));
        for (const tick of yScale.ticks) {
            const y = toY(tick);
            svg.appendChild(this._svgEl('line', {
                x1: margin.left, y1: y, x2: margin.left + plotW, y2: y,
                stroke: this.colors.gridLine, 'stroke-width': '1', 'stroke-dasharray': '3,3'
            }));
            const label = this._svgEl('text', {
                x: margin.left - 10, y: y + 4,
                'text-anchor': 'end', 'font-size': '11', fill: this.colors.textLight
            });
            label.textContent = this._formatNum(tick);
            svg.appendChild(label);
        }
        
        // Bars
        const groupW = plotW / nGroups;
        const barW = Math.min(groupW * 0.7 / nSeries, 50);
        const groupPad = (groupW - barW * nSeries) / 2;
        
        categories.forEach((cat, gi) => {
            const gx = margin.left + gi * groupW;
            series.forEach((s, si) => {
                const val = (s.values || [])[gi] || 0;
                const bx = gx + groupPad + si * barW;
                const by = toY(val);
                const bh = toY(0) - by;
                const color = s.color || this.defaultSeriesColors[si % this.defaultSeriesColors.length];
                
                svg.appendChild(this._svgEl('rect', {
                    x: bx, y: by, width: barW - 2, height: Math.max(0, bh),
                    fill: color, rx: '3', ry: '3'
                }));
                
                // Value label
                if (val > 0) {
                    const vl = this._svgEl('text', {
                        x: bx + (barW - 2) / 2, y: by - 5,
                        'text-anchor': 'middle', 'font-size': '10', 'font-weight': '600', fill: color
                    });
                    vl.textContent = this._formatNum(val);
                    svg.appendChild(vl);
                }
            });
            
            // Category label
            const cl = this._svgEl('text', {
                x: gx + groupW / 2, y: margin.top + plotH + 20,
                'text-anchor': 'middle', 'font-size': '11', fill: this.colors.text
            });
            cl.textContent = cat;
            svg.appendChild(cl);
        });
        
        // Axes
        svg.appendChild(this._svgEl('line', {
            x1: margin.left, y1: margin.top + plotH, x2: margin.left + plotW, y2: margin.top + plotH,
            stroke: this.colors.text, 'stroke-width': '2'
        }));
        svg.appendChild(this._svgEl('line', {
            x1: margin.left, y1: margin.top, x2: margin.left, y2: margin.top + plotH,
            stroke: this.colors.text, 'stroke-width': '2'
        }));
        
        // Labels
        if (config.title) {
            const t = this._svgEl('text', {
                x: W / 2, y: 25, 'text-anchor': 'middle', 'font-size': '15', 'font-weight': '700', fill: this.colors.text
            });
            t.textContent = config.title;
            svg.appendChild(t);
        }
        if (config.xLabel) {
            const xl = this._svgEl('text', {
                x: margin.left + plotW / 2, y: H - 10,
                'text-anchor': 'middle', 'font-size': '13', 'font-weight': '600', fill: this.colors.text
            });
            xl.textContent = config.xLabel;
            svg.appendChild(xl);
        }
        if (config.yLabel) {
            const yl = this._svgEl('text', {
                x: 15, y: margin.top + plotH / 2,
                'text-anchor': 'middle', 'font-size': '13', 'font-weight': '600', fill: this.colors.text,
                transform: `rotate(-90, 15, ${margin.top + plotH / 2})`
            });
            yl.textContent = config.yLabel;
            svg.appendChild(yl);
        }
        
        // Legend
        const lx = margin.left + plotW + 15;
        let ly = margin.top + 10;
        series.forEach((s, si) => {
            const color = s.color || this.defaultSeriesColors[si % this.defaultSeriesColors.length];
            svg.appendChild(this._svgEl('rect', {
                x: lx, y: ly, width: 14, height: 14, fill: color, rx: '3'
            }));
            const label = this._svgEl('text', {
                x: lx + 20, y: ly + 11, 'font-size': '11', fill: this.colors.text
            });
            label.textContent = s.name || `Series ${si + 1}`;
            svg.appendChild(label);
            ly += 22;
        });
        
        container.appendChild(svg);
        return svg;
    },
    
    /**
     * AREA CHART (concentration profile with layer shading)
     * config: same as lineChart, plus layerBoundaries and layerColors
     */
    profileChart(container, config) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        container.innerHTML = '';
        
        const W = config.width || 700;
        const H = config.height || 400;
        const margin = { top: 50, right: 30, bottom: 60, left: 70 };
        if (config.series && config.series.length > 1) margin.right = 160;
        const plotW = W - margin.left - margin.right;
        const plotH = H - margin.top - margin.bottom;
        
        const svg = this._svgEl('svg', {
            viewBox: `0 0 ${W} ${H}`,
            preserveAspectRatio: 'xMidYMid meet',
            style: 'width:100%;height:auto;max-height:450px;font-family:Inter,system-ui,sans-serif;'
        });
        
        const xScale = this._niceScale(0, 1, 8);
        const yScale = this._niceScale(0, 1, 6);
        const toX = x => margin.left + (x - xScale.min) / (xScale.max - xScale.min) * plotW;
        const toY = y => margin.top + plotH - (y - yScale.min) / (yScale.max - yScale.min) * plotH;
        
        // Layer background bands
        const layerColors = config.layerColors || {
            chitosan: 'rgba(26,92,94,0.08)',
            hydrogel: 'rgba(45,143,143,0.08)',
            biochar: 'rgba(60,60,60,0.1)',
            chamber: 'rgba(58,125,68,0.08)'
        };
        const layerLabels = config.layerLabels || {
            chitosan: 'Chitosan', hydrogel: 'Hydrogel', biochar: 'Biochar', chamber: 'Chamber'
        };
        const boundaries = config.layerBoundaries || [0, 0.05, 0.4, 0.7, 1.0];
        const layerNames = ['chitosan', 'hydrogel', 'biochar', 'chamber'];
        
        boundaries.forEach((b, i) => {
            if (i < boundaries.length - 1) {
                const x1 = toX(b);
                const x2 = toX(boundaries[i+1]);
                const name = layerNames[i] || '';
                svg.appendChild(this._svgEl('rect', {
                    x: x1, y: margin.top, width: x2 - x1, height: plotH,
                    fill: layerColors[name] || 'transparent'
                }));
                // Layer label at top
                const lbl = this._svgEl('text', {
                    x: (x1 + x2) / 2, y: margin.top + 15,
                    'text-anchor': 'middle', 'font-size': '9', fill: this.colors.textLight, 'font-style': 'italic'
                });
                lbl.textContent = layerLabels[name] || '';
                svg.appendChild(lbl);
            }
        });
        
        // Then draw grid and data on top (same as lineChart)
        // Background border
        svg.appendChild(this._svgEl('rect', {
            x: margin.left, y: margin.top, width: plotW, height: plotH,
            fill: 'none', stroke: '#e0e0e0', 'stroke-width': '1'
        }));
        
        // Grid
        for (const tick of yScale.ticks) {
            const y = toY(tick);
            svg.appendChild(this._svgEl('line', {
                x1: margin.left, y1: y, x2: margin.left + plotW, y2: y,
                stroke: this.colors.gridLine, 'stroke-width': '1', 'stroke-dasharray': '3,3'
            }));
            const label = this._svgEl('text', {
                x: margin.left - 10, y: y + 4,
                'text-anchor': 'end', 'font-size': '11', fill: this.colors.textLight
            });
            label.textContent = this._formatNum(tick);
            svg.appendChild(label);
        }
        for (const tick of xScale.ticks) {
            const x = toX(tick);
            const label = this._svgEl('text', {
                x: x, y: margin.top + plotH + 20,
                'text-anchor': 'middle', 'font-size': '11', fill: this.colors.textLight
            });
            label.textContent = this._formatNum(tick);
            svg.appendChild(label);
        }
        
        // Data lines
        const seriesArr = config.series || [];
        seriesArr.forEach((s, si) => {
            if (!s.data || s.data.length === 0) return;
            const color = s.color || this.defaultSeriesColors[si % this.defaultSeriesColors.length];
            const pts = s.data.map(p => `${toX(p.x)},${toY(Math.max(yScale.min, Math.min(yScale.max, p.y)))}`).join(' ');
            const line = this._svgEl('polyline', {
                points: pts, fill: 'none', stroke: color, 'stroke-width': '2.5',
                'stroke-linejoin': 'round', 'stroke-linecap': 'round'
            });
            if (s.dash) line.setAttribute('stroke-dasharray', '8,4');
            svg.appendChild(line);
        });
        
        // Axes
        svg.appendChild(this._svgEl('line', {
            x1: margin.left, y1: margin.top + plotH, x2: margin.left + plotW, y2: margin.top + plotH,
            stroke: this.colors.text, 'stroke-width': '2'
        }));
        svg.appendChild(this._svgEl('line', {
            x1: margin.left, y1: margin.top, x2: margin.left, y2: margin.top + plotH,
            stroke: this.colors.text, 'stroke-width': '2'
        }));
        
        // Labels
        if (config.title) {
            const t = this._svgEl('text', {
                x: margin.left + plotW / 2, y: 25,
                'text-anchor': 'middle', 'font-size': '15', 'font-weight': '700', fill: this.colors.text
            });
            t.textContent = config.title;
            svg.appendChild(t);
        }
        if (config.xLabel) {
            const xl = this._svgEl('text', {
                x: margin.left + plotW / 2, y: H - 10,
                'text-anchor': 'middle', 'font-size': '13', 'font-weight': '600', fill: this.colors.text
            });
            xl.textContent = config.xLabel;
            svg.appendChild(xl);
        }
        if (config.yLabel) {
            const yl = this._svgEl('text', {
                x: 15, y: margin.top + plotH / 2,
                'text-anchor': 'middle', 'font-size': '13', 'font-weight': '600', fill: this.colors.text,
                transform: `rotate(-90, 15, ${margin.top + plotH / 2})`
            });
            yl.textContent = config.yLabel;
            svg.appendChild(yl);
        }
        
        // Legend
        if (seriesArr.length > 1) {
            const lx = margin.left + plotW + 15;
            let ly = margin.top + 10;
            seriesArr.forEach((s, si) => {
                const color = s.color || this.defaultSeriesColors[si % this.defaultSeriesColors.length];
                const line = this._svgEl('line', {
                    x1: lx, y1: ly + 6, x2: lx + 25, y2: ly + 6,
                    stroke: color, 'stroke-width': '3'
                });
                if (s.dash) line.setAttribute('stroke-dasharray', '6,3');
                svg.appendChild(line);
                const label = this._svgEl('text', {
                    x: lx + 30, y: ly + 10, 'font-size': '11', fill: this.colors.text
                });
                label.textContent = s.name || `Series ${si + 1}`;
                svg.appendChild(label);
                ly += 22;
            });
        }
        
        container.appendChild(svg);
        return svg;
    }
};

if (typeof window !== 'undefined') window.HaloChart = HaloChart;
