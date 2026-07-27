/* charts.js — tiny dependency-free SVG chart helpers. */
(function () {
  "use strict";

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function dayNum(iso) {
    var p = (iso || "").split("-");
    if (p.length < 3) return 0;
    return Math.floor(Date.UTC(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)) / 86400000);
  }

  // points: [{date: "YYYY-MM-DD", value: Number}], target: Number|null
  // opts: { unit, yMax, yMin, aim: {fromDate, fromValue, toDate, toValue} }
  // The x-axis is time-proportional so an aim (projection) line lands on the
  // review date correctly.
  function lineChart(points, target, opts) {
    opts = opts || {};
    var aim = opts.aim && opts.aim.toValue != null && opts.aim.fromDate && opts.aim.toDate ? opts.aim : null;
    var W = 640, H = 260;
    var pad = { top: 20, right: 20, bottom: 44, left: 44 };
    var innerW = W - pad.left - pad.right;
    var innerH = H - pad.top - pad.bottom;

    var vals = points.map(function (p) { return p.value; }).filter(function (v) { return v != null && !isNaN(v); });
    if (target != null && !isNaN(target)) vals.push(target);
    if (aim) { vals.push(aim.fromValue); vals.push(aim.toValue); }

    var yMax = opts.yMax != null ? opts.yMax : (vals.length ? Math.max.apply(null, vals) : 10);
    var yMin = opts.yMin != null ? opts.yMin : 0;
    if (yMax <= yMin) yMax = yMin + 1;
    if (opts.yMax == null) yMax = yMax + (yMax - yMin) * 0.1;
    // Whole-number axis for count data (avoids ticks like 0.8, 1.7…).
    if (opts.integer) {
      var top = Math.max(1, Math.ceil(vals.length ? Math.max.apply(null, vals) : 1));
      var step = Math.ceil(top / 4);
      yMin = 0;
      yMax = step * 4;
    }

    // Time domain
    var dates = points.map(function (p) { return dayNum(p.date); });
    var minX = dates.length ? Math.min.apply(null, dates) : 0;
    var maxX = dates.length ? Math.max.apply(null, dates) : 1;
    if (aim) { minX = Math.min(minX, dayNum(aim.fromDate)); maxX = Math.max(maxX, dayNum(aim.toDate)); }
    if (points.length < 2 && !aim) { minX -= 1; maxX += 1; } // center a lone point
    if (maxX === minX) maxX = minX + 1;

    function xd(iso) { return pad.left + ((dayNum(iso) - minX) / (maxX - minX)) * innerW; }
    function y(v) { return pad.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH; }

    var svg = [];
    svg.push('<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Progress over time chart">');

    // Y gridlines
    var steps = 4;
    for (var g = 0; g <= steps; g++) {
      var v = yMin + (yMax - yMin) * (g / steps);
      var yy = y(v);
      svg.push('<line x1="' + pad.left + '" y1="' + yy.toFixed(1) + '" x2="' + (W - pad.right) + '" y2="' + yy.toFixed(1) + '" stroke="#e2e7f0" stroke-width="1" />');
      svg.push('<text x="' + (pad.left - 8) + '" y="' + (yy + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#667089">' + (Math.round(v * 10) / 10) + '</text>');
    }

    // Aim / projection line (baseline -> target by review date)
    if (aim) {
      svg.push('<line x1="' + xd(aim.fromDate).toFixed(1) + '" y1="' + y(aim.fromValue).toFixed(1) + '" x2="' + xd(aim.toDate).toFixed(1) + '" y2="' + y(aim.toValue).toFixed(1) + '" stroke="#7c5cd6" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round" />');
      svg.push('<text x="' + xd(aim.toDate).toFixed(1) + '" y="' + (y(aim.toValue) + 14).toFixed(1) + '" text-anchor="end" font-size="10" fill="#7c5cd6" font-weight="600">Aim line</text>');
    }

    // Target line
    if (target != null && !isNaN(target)) {
      var ty = y(target);
      svg.push('<line x1="' + pad.left + '" y1="' + ty.toFixed(1) + '" x2="' + (W - pad.right) + '" y2="' + ty.toFixed(1) + '" stroke="#1f9d6b" stroke-width="2" stroke-dasharray="6 4" />');
      svg.push('<text x="' + (W - pad.right) + '" y="' + (ty - 6).toFixed(1) + '" text-anchor="end" font-size="11" fill="#1f9d6b" font-weight="600">Target ' + esc(target + (opts.unit || "")) + '</text>');
    }

    // Data path
    if (points.length > 0) {
      var d = "";
      points.forEach(function (p) {
        if (p.value == null || isNaN(p.value)) return;
        d += (d === "" ? "M" : "L") + xd(p.date).toFixed(1) + " " + y(p.value).toFixed(1) + " ";
      });
      if (d) svg.push('<path d="' + d.trim() + '" fill="none" stroke="#3f6fe0" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />');

      points.forEach(function (p) {
        if (p.value == null || isNaN(p.value)) return;
        svg.push('<circle cx="' + xd(p.date).toFixed(1) + '" cy="' + y(p.value).toFixed(1) + '" r="4" fill="#3f6fe0"><title>' + esc(p.date + ": " + p.value + (opts.unit || "")) + '</title></circle>');
      });

      // X axis labels — a handful of data dates, plus the aim end date.
      var n = points.length;
      var labelEvery = Math.ceil(n / 6);
      points.forEach(function (p, i) {
        if (i % labelEvery !== 0 && i !== n - 1) return;
        svg.push('<text x="' + xd(p.date).toFixed(1) + '" y="' + (H - pad.bottom + 18) + '" text-anchor="middle" font-size="10" fill="#667089">' + esc(shortDate(p.date)) + '</text>');
      });
      if (aim) {
        svg.push('<text x="' + xd(aim.toDate).toFixed(1) + '" y="' + (H - pad.bottom + 18) + '" text-anchor="middle" font-size="10" fill="#7c5cd6" font-weight="600">' + esc(shortDate(aim.toDate)) + '</text>');
      }
    }

    svg.push('</svg>');
    return svg.join("");
  }

  function shortDate(iso) {
    if (!iso) return "";
    var parts = iso.split("-");
    if (parts.length < 3) return iso;
    return parseInt(parts[1], 10) + "/" + parseInt(parts[2], 10);
  }

  // Simple horizontal bar chart for behavior frequency etc.
  // data: [{label, value, color}]
  function barChart(data) {
    if (!data.length) return '<p class="muted small">No data yet.</p>';
    var max = Math.max.apply(null, data.map(function (d) { return d.value; }));
    if (max <= 0) max = 1;
    var rows = data.map(function (d) {
      var pct = Math.round((d.value / max) * 100);
      return '<div style="margin-bottom:10px">' +
        '<div class="flex-between small" style="margin-bottom:4px"><span>' + esc(d.label) + '</span><span class="muted">' + d.value + '</span></div>' +
        '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%;background:' + (d.color || "#3f6fe0") + '"></div></div>' +
        '</div>';
    });
    return rows.join("");
  }

  window.Charts = { lineChart: lineChart, barChart: barChart };
})();
