/**
 * NAVETTE EXPRESS - Système de Graphiques
 * Charts vanilla JS Canvas - W2K-Digital 2025
 * 
 * Types supportés:
 * - Lignes (line)
 * - Barres (bar)
 * - Donut/Pie (donut)
 * - Aire (area)
 * - Sparkline (mini graphiques)
 */

const NXCharts = (function() {
    'use strict';

    // Configuration globale
    const CONFIG = {
        colors: {
            primary: '#1B2A4A',
            secondary: '#2EC4B6',
            gold: '#C8A951',
            success: '#2ECC71',
            error: '#E74C3C',
            warning: '#F39C12',
            info: '#3498DB',
            purple: '#9B59B6',
            grid: 'rgba(255, 255, 255, 0.1)',
            text: 'rgba(255, 255, 255, 0.7)',
            textLight: 'rgba(255, 255, 255, 0.5)'
        },
        fonts: {
            family: 'Montserrat, sans-serif',
            size: 12,
            weight: '500'
        },
        animation: {
            duration: 800,
            easing: 'easeOutQuart'
        }
    };

    // Palette de couleurs pour séries multiples
    const PALETTE = [
        '#2EC4B6', // Turquoise
        '#C8A951', // Or
        '#3498DB', // Bleu
        '#2ECC71', // Vert
        '#9B59B6', // Violet
        '#E74C3C', // Rouge
        '#F39C12', // Orange
        '#1ABC9C'  // Teal
    ];

    // Fonctions d'easing
    const EASINGS = {
        linear: t => t,
        easeOutQuad: t => t * (2 - t),
        easeOutCubic: t => (--t) * t * t + 1,
        easeOutQuart: t => 1 - (--t) * t * t * t,
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    };

    /**
     * Classe de base pour tous les graphiques
     */
    class BaseChart {
        constructor(container, options = {}) {
            this.container = typeof container === 'string' 
                ? document.querySelector(container) 
                : container;
            
            if (!this.container) {
                console.error('Container non trouvé');
                return;
            }

            this.options = this.mergeOptions(this.getDefaultOptions(), options);
            this.canvas = null;
            this.ctx = null;
            this.animationProgress = 0;
            this.animationId = null;
            this.data = options.data || [];
            
            this.init();
        }

        getDefaultOptions() {
            return {
                responsive: true,
                padding: { top: 20, right: 20, bottom: 40, left: 50 },
                animation: true,
                animationDuration: CONFIG.animation.duration,
                showGrid: true,
                showLabels: true,
                showLegend: true,
                legendPosition: 'bottom',
                tooltips: true
            };
        }

        mergeOptions(defaults, options) {
            return { ...defaults, ...options };
        }

        init() {
            // Créer le canvas
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');
            this.container.innerHTML = '';
            this.container.appendChild(this.canvas);

            // Dimensionner
            this.resize();

            // Écouter le redimensionnement
            if (this.options.responsive) {
                window.addEventListener('resize', this.debounce(() => {
                    this.resize();
                    this.render();
                }, 250));
            }

            // Ajouter les tooltips
            if (this.options.tooltips) {
                this.initTooltips();
            }
        }

        resize() {
            const rect = this.container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            
            this.width = rect.width;
            this.height = rect.height || 300;
            
            this.canvas.width = this.width * dpr;
            this.canvas.height = this.height * dpr;
            this.canvas.style.width = this.width + 'px';
            this.canvas.style.height = this.height + 'px';
            
            this.ctx.scale(dpr, dpr);

            // Zone de dessin utile
            this.chartArea = {
                x: this.options.padding.left,
                y: this.options.padding.top,
                width: this.width - this.options.padding.left - this.options.padding.right,
                height: this.height - this.options.padding.top - this.options.padding.bottom
            };
        }

        initTooltips() {
            this.tooltip = document.createElement('div');
            this.tooltip.className = 'nx-chart-tooltip';
            this.tooltip.style.cssText = `
                position: absolute;
                background: rgba(15, 26, 46, 0.95);
                border: 1px solid rgba(46, 196, 182, 0.3);
                border-radius: 8px;
                padding: 10px 14px;
                font-size: 13px;
                color: #fff;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s ease;
                z-index: 1000;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            `;
            document.body.appendChild(this.tooltip);

            this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            this.canvas.addEventListener('mouseleave', () => this.hideTooltip());
        }

        showTooltip(content, x, y) {
            this.tooltip.innerHTML = content;
            this.tooltip.style.opacity = '1';
            
            const rect = this.canvas.getBoundingClientRect();
            const tooltipRect = this.tooltip.getBoundingClientRect();
            
            let left = rect.left + x + 15;
            let top = rect.top + y - 10;
            
            // Ajustement si déborde
            if (left + tooltipRect.width > window.innerWidth) {
                left = rect.left + x - tooltipRect.width - 15;
            }
            if (top < 0) {
                top = rect.top + y + 20;
            }
            
            this.tooltip.style.left = left + 'px';
            this.tooltip.style.top = top + 'px';
        }

        hideTooltip() {
            if (this.tooltip) {
                this.tooltip.style.opacity = '0';
            }
        }

        handleMouseMove(e) {
            // À surcharger dans les classes enfants
        }

        animate(callback) {
            if (!this.options.animation) {
                this.animationProgress = 1;
                callback(1);
                return;
            }

            const start = performance.now();
            const duration = this.options.animationDuration;
            const easing = EASINGS[CONFIG.animation.easing] || EASINGS.easeOutQuart;

            const step = (timestamp) => {
                const elapsed = timestamp - start;
                this.animationProgress = Math.min(elapsed / duration, 1);
                const easedProgress = easing(this.animationProgress);
                
                callback(easedProgress);

                if (this.animationProgress < 1) {
                    this.animationId = requestAnimationFrame(step);
                }
            };

            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            this.animationId = requestAnimationFrame(step);
        }

        clear() {
            this.ctx.clearRect(0, 0, this.width, this.height);
        }

        drawGrid() {
            if (!this.options.showGrid) return;

            const { x, y, width, height } = this.chartArea;
            const ctx = this.ctx;
            const steps = 5;

            ctx.strokeStyle = CONFIG.colors.grid;
            ctx.lineWidth = 1;

            // Lignes horizontales
            for (let i = 0; i <= steps; i++) {
                const yPos = y + (height / steps) * i;
                ctx.beginPath();
                ctx.moveTo(x, yPos);
                ctx.lineTo(x + width, yPos);
                ctx.stroke();
            }
        }

        formatNumber(num) {
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M';
            } else if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString();
        }

        formatCurrency(amount) {
            return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
        }

        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        render() {
            // À surcharger
        }

        update(newData) {
            this.data = newData;
            this.render();
        }

        destroy() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            if (this.tooltip && this.tooltip.parentNode) {
                this.tooltip.parentNode.removeChild(this.tooltip);
            }
            this.container.innerHTML = '';
        }
    }

    /**
     * Graphique en Lignes
     */
    class LineChart extends BaseChart {
        getDefaultOptions() {
            return {
                ...super.getDefaultOptions(),
                lineWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                fillOpacity: 0.1,
                smooth: true,
                tension: 0.4
            };
        }

        render() {
            this.clear();
            this.drawGrid();
            this.drawYAxis();
            this.drawXAxis();

            this.animate((progress) => {
                this.clear();
                this.drawGrid();
                this.drawYAxis();
                this.drawXAxis();
                this.drawLines(progress);
                this.drawPoints(progress);
            });
        }

        getMinMax() {
            let min = Infinity;
            let max = -Infinity;

            this.data.datasets.forEach(dataset => {
                dataset.data.forEach(value => {
                    if (value < min) min = value;
                    if (value > max) max = value;
                });
            });

            // Ajouter une marge
            const range = max - min;
            min = Math.max(0, min - range * 0.1);
            max = max + range * 0.1;

            return { min, max };
        }

        drawYAxis() {
            const { x, y, height } = this.chartArea;
            const ctx = this.ctx;
            const { min, max } = this.getMinMax();
            const steps = 5;

            ctx.font = `${CONFIG.fonts.weight} ${CONFIG.fonts.size}px ${CONFIG.fonts.family}`;
            ctx.fillStyle = CONFIG.colors.text;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';

            for (let i = 0; i <= steps; i++) {
                const value = max - ((max - min) / steps) * i;
                const yPos = y + (height / steps) * i;
                ctx.fillText(this.formatNumber(Math.round(value)), x - 10, yPos);
            }
        }

        drawXAxis() {
            const { x, y, width, height } = this.chartArea;
            const ctx = this.ctx;
            const labels = this.data.labels || [];
            const step = width / (labels.length - 1 || 1);

            ctx.font = `${CONFIG.fonts.weight} ${CONFIG.fonts.size}px ${CONFIG.fonts.family}`;
            ctx.fillStyle = CONFIG.colors.text;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            labels.forEach((label, i) => {
                const xPos = x + step * i;
                ctx.fillText(label, xPos, y + height + 15);
            });
        }

        drawLines(progress) {
            const { x, y, width, height } = this.chartArea;
            const ctx = this.ctx;
            const { min, max } = this.getMinMax();
            const labels = this.data.labels || [];
            const step = width / (labels.length - 1 || 1);

            this.data.datasets.forEach((dataset, datasetIndex) => {
                const color = dataset.color || PALETTE[datasetIndex % PALETTE.length];
                const points = [];

                // Calculer les points
                dataset.data.forEach((value, i) => {
                    const xPos = x + step * i;
                    const yPos = y + height - ((value - min) / (max - min)) * height * progress;
                    points.push({ x: xPos, y: yPos, value });
                });

                // Dessiner le remplissage
                if (this.options.fill) {
                    ctx.beginPath();
                    ctx.moveTo(points[0].x, y + height);
                    
                    if (this.options.smooth) {
                        this.drawSmoothLine(points, true);
                    } else {
                        points.forEach(p => ctx.lineTo(p.x, p.y));
                    }
                    
                    ctx.lineTo(points[points.length - 1].x, y + height);
                    ctx.closePath();
                    
                    const gradient = ctx.createLinearGradient(0, y, 0, y + height);
                    gradient.addColorStop(0, this.hexToRgba(color, this.options.fillOpacity));
                    gradient.addColorStop(1, this.hexToRgba(color, 0));
                    ctx.fillStyle = gradient;
                    ctx.fill();
                }

                // Dessiner la ligne
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = this.options.lineWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (this.options.smooth) {
                    ctx.moveTo(points[0].x, points[0].y);
                    this.drawSmoothLine(points, false);
                } else {
                    points.forEach((p, i) => {
                        if (i === 0) ctx.moveTo(p.x, p.y);
                        else ctx.lineTo(p.x, p.y);
                    });
                }
                ctx.stroke();

                // Stocker les points pour l'interactivité
                dataset._points = points;
            });
        }

        drawSmoothLine(points, fill) {
            const ctx = this.ctx;
            const tension = this.options.tension;

            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i - 1] || points[i];
                const p1 = points[i];
                const p2 = points[i + 1];
                const p3 = points[i + 2] || p2;

                const cp1x = p1.x + (p2.x - p0.x) * tension / 6;
                const cp1y = p1.y + (p2.y - p0.y) * tension / 6;
                const cp2x = p2.x - (p3.x - p1.x) * tension / 6;
                const cp2y = p2.y - (p3.y - p1.y) * tension / 6;

                if (fill && i === 0) {
                    ctx.lineTo(p1.x, p1.y);
                }
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
            }
        }

        drawPoints(progress) {
            const ctx = this.ctx;

            this.data.datasets.forEach((dataset, datasetIndex) => {
                const color = dataset.color || PALETTE[datasetIndex % PALETTE.length];
                const points = dataset._points || [];

                points.forEach(point => {
                    const radius = this.options.pointRadius * progress;
                    
                    // Cercle extérieur
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
                    ctx.fillStyle = color;
                    ctx.fill();

                    // Cercle intérieur (blanc)
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, radius * 0.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#fff';
                    ctx.fill();
                });
            });
        }

        handleMouseMove(e) {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            let found = false;

            this.data.datasets.forEach((dataset, datasetIndex) => {
                const points = dataset._points || [];
                
                points.forEach((point, pointIndex) => {
                    const distance = Math.sqrt(
                        Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2)
                    );

                    if (distance < this.options.pointHoverRadius * 2) {
                        const label = this.data.labels[pointIndex];
                        const content = `
                            <div style="font-weight: 600; margin-bottom: 4px;">${label}</div>
                            <div style="color: ${dataset.color || PALETTE[datasetIndex]}">
                                ${dataset.label || 'Valeur'}: ${this.formatNumber(point.value)}
                            </div>
                        `;
                        this.showTooltip(content, mouseX, mouseY);
                        found = true;
                    }
                });
            });

            if (!found) {
                this.hideTooltip();
            }
        }

        hexToRgba(hex, alpha) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }

    /**
     * Graphique en Barres
     */
    class BarChart extends BaseChart {
        getDefaultOptions() {
            return {
                ...super.getDefaultOptions(),
                barWidth: 0.7,
                borderRadius: 6,
                horizontal: false,
                stacked: false
            };
        }

        render() {
            this.animate((progress) => {
                this.clear();
                this.drawGrid();
                this.drawYAxis();
                this.drawXAxis();
                this.drawBars(progress);
            });
        }

        getMinMax() {
            let max = -Infinity;

            if (this.options.stacked) {
                const totals = this.data.labels.map((_, i) => {
                    return this.data.datasets.reduce((sum, dataset) => sum + dataset.data[i], 0);
                });
                max = Math.max(...totals);
            } else {
                this.data.datasets.forEach(dataset => {
                    dataset.data.forEach(value => {
                        if (value > max) max = value;
                    });
                });
            }

            return { min: 0, max: max * 1.1 };
        }

        drawYAxis() {
            const { x, y, height } = this.chartArea;
            const ctx = this.ctx;
            const { max } = this.getMinMax();
            const steps = 5;

            ctx.font = `${CONFIG.fonts.weight} ${CONFIG.fonts.size}px ${CONFIG.fonts.family}`;
            ctx.fillStyle = CONFIG.colors.text;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';

            for (let i = 0; i <= steps; i++) {
                const value = max - (max / steps) * i;
                const yPos = y + (height / steps) * i;
                ctx.fillText(this.formatNumber(Math.round(value)), x - 10, yPos);
            }
        }

        drawXAxis() {
            const { x, y, width, height } = this.chartArea;
            const ctx = this.ctx;
            const labels = this.data.labels || [];
            const barGroupWidth = width / labels.length;

            ctx.font = `${CONFIG.fonts.weight} ${CONFIG.fonts.size}px ${CONFIG.fonts.family}`;
            ctx.fillStyle = CONFIG.colors.text;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            labels.forEach((label, i) => {
                const xPos = x + barGroupWidth * i + barGroupWidth / 2;
                ctx.fillText(label, xPos, y + height + 15);
            });
        }

        drawBars(progress) {
            const { x, y, width, height } = this.chartArea;
            const ctx = this.ctx;
            const { max } = this.getMinMax();
            const labels = this.data.labels || [];
            const datasets = this.data.datasets || [];
            const barGroupWidth = width / labels.length;
            const barWidth = (barGroupWidth * this.options.barWidth) / datasets.length;
            const gap = barGroupWidth * (1 - this.options.barWidth) / 2;

            this._bars = [];

            labels.forEach((label, labelIndex) => {
                let stackedY = 0;

                datasets.forEach((dataset, datasetIndex) => {
                    const value = dataset.data[labelIndex];
                    const color = dataset.color || PALETTE[datasetIndex % PALETTE.length];
                    const barHeight = (value / max) * height * progress;

                    let barX, barY;

                    if (this.options.stacked) {
                        barX = x + barGroupWidth * labelIndex + gap;
                        barY = y + height - barHeight - stackedY;
                        stackedY += barHeight;
                    } else {
                        barX = x + barGroupWidth * labelIndex + gap + barWidth * datasetIndex;
                        barY = y + height - barHeight;
                    }

                    const fullBarWidth = this.options.stacked 
                        ? barGroupWidth * this.options.barWidth 
                        : barWidth - 2;

                    // Dessiner la barre avec coins arrondis
                    this.roundedRect(
                        barX,
                        barY,
                        fullBarWidth,
                        barHeight,
                        this.options.borderRadius,
                        color
                    );

                    // Stocker pour l'interactivité
                    this._bars.push({
                        x: barX,
                        y: barY,
                        width: fullBarWidth,
                        height: barHeight,
                        value,
                        label,
                        datasetLabel: dataset.label,
                        color
                    });
                });
            });
        }

        roundedRect(x, y, width, height, radius, color) {
            const ctx = this.ctx;
            
            if (height < radius * 2) {
                radius = height / 2;
            }

            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height);
            ctx.lineTo(x, y + height);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();

            // Gradient
            const gradient = ctx.createLinearGradient(x, y, x, y + height);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, this.darkenColor(color, 20));
            
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        darkenColor(hex, percent) {
            const num = parseInt(hex.slice(1), 16);
            const amt = Math.round(2.55 * percent);
            const R = Math.max(0, (num >> 16) - amt);
            const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
            const B = Math.max(0, (num & 0x0000FF) - amt);
            return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
        }

        handleMouseMove(e) {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const bar = this._bars?.find(b => 
                mouseX >= b.x && 
                mouseX <= b.x + b.width && 
                mouseY >= b.y && 
                mouseY <= b.y + b.height
            );

            if (bar) {
                const content = `
                    <div style="font-weight: 600; margin-bottom: 4px;">${bar.label}</div>
                    <div style="color: ${bar.color}">
                        ${bar.datasetLabel || 'Valeur'}: ${this.formatNumber(bar.value)}
                    </div>
                `;
                this.showTooltip(content, mouseX, mouseY);
            } else {
                this.hideTooltip();
            }
        }
    }

    /**
     * Graphique Donut / Pie
     */
    class DonutChart extends BaseChart {
        getDefaultOptions() {
            return {
                ...super.getDefaultOptions(),
                innerRadius: 0.6,
                startAngle: -Math.PI / 2,
                showPercentage: true,
                showLabels: true,
                labelPosition: 'outside',
                padding: { top: 20, right: 20, bottom: 60, left: 20 }
            };
        }

        render() {
            this.animate((progress) => {
                this.clear();
                this.drawSlices(progress);
                if (this.options.showLabels) {
                    this.drawLegend();
                }
            });
        }

        getTotal() {
            return this.data.reduce((sum, item) => sum + item.value, 0);
        }

        drawSlices(progress) {
            const ctx = this.ctx;
            const centerX = this.width / 2;
            const centerY = (this.height - 40) / 2;
            const radius = Math.min(centerX, centerY) - 20;
            const innerRadius = radius * this.options.innerRadius;
            const total = this.getTotal();
            
            let currentAngle = this.options.startAngle;

            this._slices = [];

            this.data.forEach((item, index) => {
                const sliceAngle = (item.value / total) * Math.PI * 2 * progress;
                const color = item.color || PALETTE[index % PALETTE.length];

                // Dessiner l'arc
                ctx.beginPath();
                ctx.moveTo(
                    centerX + Math.cos(currentAngle) * innerRadius,
                    centerY + Math.sin(currentAngle) * innerRadius
                );
                ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
                ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
                ctx.closePath();

                // Gradient radial
                const gradient = ctx.createRadialGradient(
                    centerX, centerY, innerRadius,
                    centerX, centerY, radius
                );
                gradient.addColorStop(0, this.lightenColor(color, 10));
                gradient.addColorStop(1, color);
                
                ctx.fillStyle = gradient;
                ctx.fill();

                // Bordure subtile
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Stocker pour l'interactivité
                this._slices.push({
                    startAngle: currentAngle,
                    endAngle: currentAngle + sliceAngle,
                    value: item.value,
                    label: item.label,
                    color,
                    percentage: ((item.value / total) * 100).toFixed(1)
                });

                currentAngle += sliceAngle;
            });

            // Centre texte (optionnel)
            if (this.options.centerText) {
                ctx.font = `600 24px ${CONFIG.fonts.family}`;
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.options.centerText, centerX, centerY);
            }
        }

        drawLegend() {
            const ctx = this.ctx;
            const total = this.getTotal();
            const legendY = this.height - 30;
            const itemWidth = this.width / this.data.length;

            ctx.font = `${CONFIG.fonts.weight} 11px ${CONFIG.fonts.family}`;
            ctx.textBaseline = 'middle';

            this.data.forEach((item, index) => {
                const color = item.color || PALETTE[index % PALETTE.length];
                const x = itemWidth * index + itemWidth / 2;
                const percentage = ((item.value / total) * 100).toFixed(0);

                // Carré de couleur
                ctx.fillStyle = color;
                ctx.fillRect(x - 40, legendY - 5, 10, 10);

                // Texte
                ctx.fillStyle = CONFIG.colors.text;
                ctx.textAlign = 'left';
                ctx.fillText(`${item.label} (${percentage}%)`, x - 25, legendY);
            });
        }

        handleMouseMove(e) {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const centerX = this.width / 2;
            const centerY = (this.height - 40) / 2;
            const radius = Math.min(centerX, centerY) - 20;
            const innerRadius = radius * this.options.innerRadius;

            // Calculer l'angle et la distance
            const dx = mouseX - centerX;
            const dy = mouseY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            let angle = Math.atan2(dy, dx);
            
            if (angle < this.options.startAngle) {
                angle += Math.PI * 2;
            }

            if (distance >= innerRadius && distance <= radius) {
                const slice = this._slices?.find(s => 
                    angle >= s.startAngle && angle < s.endAngle
                );

                if (slice) {
                    const content = `
                        <div style="font-weight: 600; margin-bottom: 4px;">${slice.label}</div>
                        <div style="color: ${slice.color}">${this.formatNumber(slice.value)}</div>
                        <div style="font-size: 11px; color: ${CONFIG.colors.textLight}">${slice.percentage}%</div>
                    `;
                    this.showTooltip(content, mouseX, mouseY);
                    return;
                }
            }
            
            this.hideTooltip();
        }

        lightenColor(hex, percent) {
            const num = parseInt(hex.slice(1), 16);
            const amt = Math.round(2.55 * percent);
            const R = Math.min(255, (num >> 16) + amt);
            const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
            const B = Math.min(255, (num & 0x0000FF) + amt);
            return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
        }
    }

    /**
     * Graphique en Aire
     */
    class AreaChart extends LineChart {
        getDefaultOptions() {
            return {
                ...super.getDefaultOptions(),
                fill: true,
                fillOpacity: 0.3,
                lineWidth: 2
            };
        }
    }

    /**
     * Sparkline (mini graphique)
     */
    class Sparkline extends BaseChart {
        getDefaultOptions() {
            return {
                responsive: true,
                padding: { top: 5, right: 5, bottom: 5, left: 5 },
                animation: true,
                animationDuration: 500,
                lineWidth: 2,
                lineColor: CONFIG.colors.secondary,
                fillColor: null,
                showEndpoint: true,
                endpointRadius: 4
            };
        }

        init() {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');
            this.container.innerHTML = '';
            this.container.appendChild(this.canvas);
            this.resize();
        }

        resize() {
            const rect = this.container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            
            this.width = rect.width || 100;
            this.height = rect.height || 40;
            
            this.canvas.width = this.width * dpr;
            this.canvas.height = this.height * dpr;
            this.canvas.style.width = this.width + 'px';
            this.canvas.style.height = this.height + 'px';
            
            this.ctx.scale(dpr, dpr);
        }

        render() {
            this.animate((progress) => {
                this.clear();
                this.drawSparkline(progress);
            });
        }

        drawSparkline(progress) {
            const ctx = this.ctx;
            const data = this.data;
            const padding = this.options.padding;
            const width = this.width - padding.left - padding.right;
            const height = this.height - padding.top - padding.bottom;

            if (!data || data.length < 2) return;

            const min = Math.min(...data);
            const max = Math.max(...data);
            const range = max - min || 1;
            const step = width / (data.length - 1);

            const points = data.map((value, i) => ({
                x: padding.left + step * i,
                y: padding.top + height - ((value - min) / range) * height * progress
            }));

            // Remplissage
            if (this.options.fillColor) {
                ctx.beginPath();
                ctx.moveTo(points[0].x, padding.top + height);
                points.forEach(p => ctx.lineTo(p.x, p.y));
                ctx.lineTo(points[points.length - 1].x, padding.top + height);
                ctx.closePath();
                ctx.fillStyle = this.options.fillColor;
                ctx.fill();
            }

            // Ligne
            ctx.beginPath();
            ctx.strokeStyle = this.options.lineColor;
            ctx.lineWidth = this.options.lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            points.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();

            // Point final
            if (this.options.showEndpoint && progress >= 1) {
                const lastPoint = points[points.length - 1];
                ctx.beginPath();
                ctx.arc(lastPoint.x, lastPoint.y, this.options.endpointRadius, 0, Math.PI * 2);
                ctx.fillStyle = this.options.lineColor;
                ctx.fill();
            }
        }
    }

    /**
     * API Publique
     */
    return {
        LineChart,
        BarChart,
        DonutChart,
        AreaChart,
        Sparkline,
        
        // Méthode utilitaire pour créer rapidement un graphique
        create(type, container, options) {
            const types = {
                line: LineChart,
                bar: BarChart,
                donut: DonutChart,
                pie: DonutChart,
                area: AreaChart,
                sparkline: Sparkline
            };

            const ChartClass = types[type.toLowerCase()];
            if (!ChartClass) {
                console.error(`Type de graphique inconnu: ${type}`);
                return null;
            }

            return new ChartClass(container, options);
        },

        // Couleurs disponibles
        colors: CONFIG.colors,
        palette: PALETTE
    };
})();

// Export pour utilisation modulaire
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NXCharts;
}
