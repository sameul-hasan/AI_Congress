/**
 * ClimateSphere — SVG Chart Library
 * Pure-vanilla SVG charts: SparkLine, AreaChart, BarChart, DonutChart, RadialGauge
 */

const Charts = (() => {

  // ── Helper ──────────────────────────────────────────────────
  function norm(val, min, max) { return max === min ? 0.5 : (val - min) / (max - min); }

  function safeMin(arr) {
    let m = Infinity;
    for (let i = 0; i < arr.length; i++) {
      const v = typeof arr[i] === 'number' ? arr[i] : (arr[i] && arr[i].y !== undefined ? arr[i].y : 0);
      if (v < m) m = v;
    }
    return m === Infinity ? 0 : m;
  }

  function safeMax(arr) {
    let m = -Infinity;
    for (let i = 0; i < arr.length; i++) {
      const v = typeof arr[i] === 'number' ? arr[i] : (arr[i] && arr[i].y !== undefined ? arr[i].y : 0);
      if (v > m) m = v;
    }
    return m === -Infinity ? 1 : m;
  }

  function polyPoints(data, w, h, padX = 0, padY = 4) {
    const min = safeMin(data);
    const max = safeMax(data);
    return data.map((v, i) => {
      const val = typeof v === 'number' ? v : (v && v.y !== undefined ? v.y : 0);
      const x = padX + (i / Math.max(1, data.length - 1)) * (w - 2 * padX);
      const y = padY + (1 - norm(val, min, max)) * (h - 2 * padY);
      return `${x},${y}`;
    }).join(' ');
  }

  // ── Sparkline ────────────────────────────────────────────────
  function sparkline(container, data, opts = {}) {
    if (!container || !Array.isArray(data) || data.length === 0) return;
    if (data.length > 200) {
      data = downsampleLTTB(data, 200);
    }
    const { color = '#00f5d4', height = 40, fill = true } = opts;
    const w = container.clientWidth || 200;
    const h = height;
    const min = safeMin(data), max = safeMax(data);

    const pts = polyPoints(data, w, h, 0, 3);
    const lastPts = pts.split(' ').slice(-1)[0];

    let areaPath = '';
    if (fill) {
      const coords = data.map((v, i) => {
        const val = typeof v === 'number' ? v : (v && v.y !== undefined ? v.y : 0);
        const x = (i / Math.max(1, data.length - 1)) * w;
        const y = 3 + (1 - norm(val, min, max)) * (h - 6);
        return `${x},${y}`;
      });
      areaPath = `M 0,${h} L ${coords.join(' L ')} L ${w},${h} Z`;
    }

    const id = `grad-${Math.random().toString(36).slice(2)}`;
    container.innerHTML = `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="chart-canvas">
        <defs>
          <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${fill ? `<path d="${areaPath}" fill="url(#${id})"/>` : ''}
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${lastPts.split(',')[0]}" cy="${lastPts.split(',')[1]}" r="2.5" fill="${color}"/>
      </svg>`;
  }

  // ── Area Chart ───────────────────────────────────────────────
  function areaChart(container, rawDatasets, opts = {}) {
    if (!container || !Array.isArray(rawDatasets)) return;
    const datasets = rawDatasets.map(ds => {
      let d = ds.data || [];
      if (d.length > 250) d = downsampleLTTB(d, 250);
      return { ...ds, data: d };
    });

    const {
      height = 180,
      labels = [],
      yLabel = '',
      gridLines = 4,
      animated = true,
    } = opts;

    const w = container.clientWidth || 600;
    const h = height;
    const padLeft = 40, padRight = 16, padTop = 16, padBottom = 28;
    const cw = w - padLeft - padRight;
    const ch = h - padTop - padBottom;

    const allVals = datasets.flatMap(d => d.data);
    const globalMin = safeMin(allVals) * 0.95;
    const globalMax = safeMax(allVals) * 1.05;

    const colors = ['#00f5d4', '#ffb426', '#ff5370', '#00f0ff', '#4361ee'];
    const ids = datasets.map((_, i) => `ag-${i}-${Math.random().toString(36).slice(2)}`);

    // Y-axis grid + labels
    const gridSvg = Array.from({ length: gridLines + 1 }, (_, i) => {
      const y = padTop + (i / gridLines) * ch;
      const val = globalMax - (i / gridLines) * (globalMax - globalMin);
      return `
        <line x1="${padLeft}" y1="${y}" x2="${w - padRight}" y2="${y}" stroke="var(--border-subtle, rgba(255,255,255,0.06))" stroke-width="1"/>
        <text x="${padLeft - 5}" y="${y + 3}" text-anchor="end" font-family="JetBrains Mono,monospace" font-size="8" fill="var(--on-surface-dim, #6b7778)">${val >= 1000 ? (val/1000).toFixed(1)+'k' : val.toFixed(0)}</text>`;
    }).join('');

    // X-axis labels
    const xLabelsSvg = labels.length > 0 ? labels.filter((_, i) => i % Math.ceil(labels.length / 8) === 0).map((lbl, i, arr) => {
      const idx = labels.indexOf(lbl);
      const x = padLeft + (idx / (labels.length - 1)) * cw;
      return `<text x="${x}" y="${h - 4}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8" fill="var(--on-surface-dim, #6b7778)">${lbl}</text>`;
    }).join('') : '';

    // Datasets
    const datasetSvg = datasets.map((ds, di) => {
      const color = ds.color || colors[di % colors.length];
      const pts = ds.data.map((v, i) => {
        const x = padLeft + (i / (ds.data.length - 1)) * cw;
        const y = padTop + (1 - norm(v, globalMin, globalMax)) * ch;
        return `${x},${y}`;
      });
      const lineStr = pts.join(' ');
      const first = pts[0], last = pts[pts.length - 1];
      const areaStr = `M ${padLeft},${padTop + ch} L ${lineStr} L ${padLeft + cw},${padTop + ch} Z`;
      return `
        <defs><linearGradient id="${ids[di]}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient></defs>
        <path d="${areaStr}" fill="url(#${ids[di]})"/>
        <polyline points="${lineStr}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    }).join('');

    container.innerHTML = `
      <div class="chart-crosshair-container" style="position:relative;width:100%;height:${h}px;">
        <svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" class="chart-canvas" preserveAspectRatio="none">
          ${gridSvg}
          ${datasetSvg}
          ${xLabelsSvg}
        </svg>
        <div class="chart-crosshair-line" style="position:absolute;top:${padTop}px;bottom:${padBottom}px;width:1px;background:rgba(70,246,190,0.6);pointer-events:none;display:none;z-index:10;"></div>
        <div class="chart-tooltip-box" style="position:absolute;pointer-events:none;background:var(--surface-high);border:1px solid var(--border-medium);border-radius:var(--radius-sm);padding:6px 10px;font-family:var(--font-mono);font-size:10px;color:var(--on-surface);box-shadow:0 8px 24px rgba(0,0,0,0.5);display:none;z-index:20;white-space:nowrap;"></div>
      </div>`;

    const root = container.querySelector ? container.querySelector('.chart-crosshair-container') : null;
    if (!root) return;
    const crosshair = root.querySelector('.chart-crosshair-line');
    const tooltip = root.querySelector('.chart-tooltip-box');

    function onPointerMove(e) {
      if (!root.getBoundingClientRect) return;
      const rect = root.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      if (relX < padLeft || relX > rect.width - padRight) {
        if (crosshair) crosshair.style.display = 'none';
        if (tooltip) tooltip.style.display = 'none';
        return;
      }

      const activeCw = rect.width - padLeft - padRight;
      const ratio = Math.max(0, Math.min(1, (relX - padLeft) / activeCw));
      const firstDs = datasets[0] ? datasets[0].data : [];
      const idx = Math.min(firstDs.length - 1, Math.max(0, Math.round(ratio * (firstDs.length - 1))));

      if (crosshair) {
        crosshair.style.display = 'block';
        crosshair.style.left = `${relX}px`;
      }

      if (tooltip) {
        const timeLabel = labels && labels[idx] ? `[${labels[idx]}]` : `Point #${idx + 1}`;
        const items = datasets.map((ds, di) => {
          const c = ds.color || colors[di % colors.length];
          const val = ds.data && ds.data[idx] !== undefined ? ds.data[idx] : '-';
          const name = ds.label || (di === 0 ? 'CO₂' : di === 1 ? 'NOₓ' : `Channel ${di + 1}`);
          return `<div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
            <span style="width:7px;height:7px;background:${c};border-radius:50%;display:inline-block;"></span>
            <span style="color:var(--on-surface-variant);font-size:9px;">${name}:</span>
            <span style="font-weight:700;color:var(--on-surface);">${val}</span>
          </div>`;
        }).join('');

        tooltip.innerHTML = `<div style="font-size:9px;color:var(--primary);margin-bottom:2px;font-weight:600;">${timeLabel}</div>${items}`;
        tooltip.style.display = 'block';

        const ttW = tooltip.offsetWidth || 120;
        let leftPos = relX + 12;
        if (leftPos + ttW > rect.width - 8) {
          leftPos = relX - ttW - 12;
        }
        tooltip.style.left = `${Math.max(4, leftPos)}px`;
        tooltip.style.top = `${Math.max(4, Math.min(rect.height - 40, relY - 10))}px`;
      }
    }

    function onPointerLeave() {
      if (crosshair) crosshair.style.display = 'none';
      if (tooltip) tooltip.style.display = 'none';
    }

    if (root.addEventListener) {
      root.addEventListener('mousemove', onPointerMove);
      root.addEventListener('touchmove', onPointerMove, { passive: true });
      root.addEventListener('mouseleave', onPointerLeave);
      root.addEventListener('touchend', onPointerLeave);
    }
  }

  // ── Bar Chart ────────────────────────────────────────────────
  function barChart(container, data, opts = {}) {
    const { height = 140, color = '#00f5d4', labels = [], horizontal = false } = opts;
    const w = container.clientWidth || 400;
    const h = height;
    const max = Math.max(...data);
    const barCount = data.length;
    const gap = 4;
    const barW = (w - gap * (barCount + 1)) / barCount;
    const padBottom = labels.length > 0 ? 20 : 4;
    const chartH = h - padBottom;

    const bars = data.map((v, i) => {
      const x = gap + i * (barW + gap);
      const barH = (v / max) * chartH;
      const y = chartH - barH;
      const alpha = 0.4 + 0.6 * (v / max);
      const lbl = labels[i] || '';
      return `
        <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="2"
          fill="${color}" opacity="${alpha}"/>
        ${lbl ? `<text x="${x + barW/2}" y="${h - 4}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8" fill="#6b7778">${lbl}</text>` : ''}`;
    }).join('');

    container.innerHTML = `
      <svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" class="chart-canvas" preserveAspectRatio="none">
        ${bars}
      </svg>`;
  }

  // ── Donut Chart ───────────────────────────────────────────────
  // Accepts two formats:
  //   1. Array of objects: [{value, color}, ...]
  //   2. Array of numbers: [12, 4, 8] with opts.colors = ['#ff6b6b', ...]
  function donut(container, segments, opts = {}) {
    const {
      size = 120, thickness = 18, label = '', sublabel = '',
      colors = ['#00f5d4','#ffb426','#ff5370','#00f0ff','#dae2fd'],
      labels: segLabels = [],
    } = opts;

    // Normalise to [{value, color, label}]
    const normalised = segments.map((seg, i) =>
      typeof seg === 'object' && seg !== null && 'value' in seg
        ? { value: seg.value, color: seg.color || colors[i % colors.length], label: seg.label || segLabels[i] || '' }
        : { value: seg, color: colors[i % colors.length], label: segLabels[i] || '' }
    );

    const cx = size / 2, cy = size / 2, r = (size - thickness) / 2;
    const circ = 2 * Math.PI * r;
    const total = normalised.reduce((a, b) => a + b.value, 0) || 1;
    let offset = 0;

    const arcs = normalised.map((seg) => {
      const frac = seg.value / total;
      const dash = frac * circ;
      const gap = circ - dash;
      const svg = `<circle cx="${cx}" cy="${cy}" r="${r}"
        fill="none" stroke="${seg.color}" stroke-width="${thickness - 2}"
        stroke-dasharray="${dash} ${gap}"
        stroke-dashoffset="${-offset + circ * 0.25}"
        stroke-linecap="butt" opacity="0.9"><title>${seg.label}: ${seg.value}</title></circle>`;
      offset += dash;
      return svg;
    }).join('');

    // Central label — use the passed `label` or the largest segment label
    const centerLabel = label || (normalised.sort((a,b) => b.value - a.value)[0].label || '');

    container.innerHTML = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="${thickness - 2}"/>
        ${arcs}
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="${size > 100 ? 16 : 12}" font-weight="600" fill="#e0e3e4">${centerLabel}</text>
        <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8" fill="#6b7778">${sublabel}</text>
      </svg>`;
  }

  // ── Radial Gauge ─────────────────────────────────────────────
  function gauge(container, value, max, opts = {}) {
    const { size = 100, color = '#00f5d4', label = '', unit = '' } = opts;
    const cx = size / 2, cy = size / 2;
    const r = size * 0.38;
    const startAngle = -215, totalArc = 250;
    const frac = Math.min(value / max, 1);
    const angle = startAngle + frac * totalArc;
    const toRad = a => a * Math.PI / 180;
    const arc = (a, large) => `${cx + r * Math.cos(toRad(a))},${cy + r * Math.sin(toRad(a))}`;

    const bgStart = arc(startAngle);
    const bgEnd = arc(startAngle + totalArc);
    const valEnd = arc(angle);
    const largeBg = totalArc > 180 ? 1 : 0;
    const largeVal = frac * totalArc > 180 ? 1 : 0;

    container.innerHTML = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <path d="M ${bgStart} A ${r} ${r} 0 ${largeBg} 1 ${bgEnd}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6" stroke-linecap="round"/>
        ${frac > 0 ? `<path d="M ${bgStart} A ${r} ${r} 0 ${largeVal} 1 ${valEnd}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>` : ''}
        <text x="${cx}" y="${cy + 3}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="${size > 80 ? 13 : 10}" font-weight="600" fill="#e0e3e4">${value}</text>
        <text x="${cx}" y="${cy + 13}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="7" fill="#6b7778">${unit}</text>
        <text x="${cx}" y="${size - 6}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="7" fill="#6b7778">${label}</text>
      </svg>`;
  }

  // ── Heatmap (Calendar) ────────────────────────────────────────
  function heatmap(container, data, opts = {}) {
    const { weeks = 26, cellSize = 10, gap = 2, colors = ['#0d1d2c', '#004a40', '#008e7e', '#00ccb0', '#00f5d4'] } = opts;
    const h = 7 * (cellSize + gap) + 20;
    const w = weeks * (cellSize + gap);
    const max = Math.max(...data.map(d => d.value));

    const cells = data.map(d => {
      const week = d.week, day = d.day;
      const x = week * (cellSize + gap);
      const y = day * (cellSize + gap) + 16;
      const idx = Math.round((d.value / max) * (colors.length - 1));
      return `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="1.5" fill="${colors[idx]}" opacity="0.9">
        <title>${d.label || d.value}</title></rect>`;
    }).join('');

    const days = ['M', '', 'W', '', 'F', '', 'S'];
    const dayLabels = days.map((d, i) => d ? `<text x="0" y="${i * (cellSize + gap) + 16 + cellSize / 2 + 4}" font-family="JetBrains Mono,monospace" font-size="7" fill="#6b7778">${d}</text>` : '').join('');

    container.innerHTML = `<svg width="${w + 20}" height="${h}" viewBox="-20 0 ${w + 20} ${h}" style="overflow:visible">${dayLabels}${cells}</svg>`;
  }

  // ── Largest Triangle Three Buckets (LTTB) Downsampling ──────────
  function downsampleLTTB(data, threshold) {
    if (!Array.isArray(data) || data.length <= threshold || threshold <= 2) {
      return data;
    }
    const sampled = [];
    const every = (data.length - 2) / (threshold - 2);
    let a = 0;
    sampled.push(data[a]);

    for (let i = 0; i < threshold - 2; i++) {
      let avgX = 0, avgY = 0;
      const avgRangeStart = Math.floor((i + 1) * every) + 1;
      const avgRangeEnd = Math.min(Math.floor((i + 2) * every) + 1, data.length);
      const avgRangeLength = avgRangeEnd - avgRangeStart;

      for (let j = avgRangeStart; j < avgRangeEnd; j++) {
        const pt = typeof data[j] === 'number' ? { x: j, y: data[j] } : data[j];
        avgX += pt.x !== undefined ? pt.x : j;
        avgY += pt.y !== undefined ? pt.y : data[j];
      }
      avgX /= Math.max(1, avgRangeLength);
      avgY /= Math.max(1, avgRangeLength);

      const rangeOffs = Math.floor(i * every) + 1;
      const rangeTo = Math.min(Math.floor((i + 1) * every) + 1, data.length);
      const ptA = typeof data[a] === 'number' ? { x: a, y: data[a] } : data[a];
      const ax = ptA.x !== undefined ? ptA.x : a;
      const ay = ptA.y !== undefined ? ptA.y : data[a];

      let maxArea = -1;
      let nextA = rangeOffs;

      for (let j = rangeOffs; j < rangeTo; j++) {
        const ptB = typeof data[j] === 'number' ? { x: j, y: data[j] } : data[j];
        const bx = ptB.x !== undefined ? ptB.x : j;
        const by = ptB.y !== undefined ? ptB.y : data[j];

        const area = Math.abs((ax - avgX) * (by - ay) - (ax - bx) * (avgY - ay)) * 0.5;
        if (area > maxArea) {
          maxArea = area;
          nextA = j;
        }
      }

      sampled.push(data[nextA]);
      a = nextA;
    }

    sampled.push(data[data.length - 1]);
    return sampled;
  }

  return { sparkline, areaChart, barChart, donut, gauge, heatmap, downsampleLTTB };
})();

if (typeof window !== 'undefined') {
  window.Charts = Charts;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Charts;
}
