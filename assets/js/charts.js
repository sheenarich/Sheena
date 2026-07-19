/* charts.js — tiny dependency-free SVG chart helpers. */
(function () {
  "use strict";

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // points: [{date: "YYYY-MM-DD", value: Number}], target: Number|null
  // opts: { unit, yMax, yMin, higherIsBetter }
  function lineChart(points, target, opts) {
    opts = opts || {};
    var W = 640, H = 260;
    var pad = { top: 20, right: 20, bottom: 44, left: 44 };
    var innerW = W - pad.left - pad.right;
    var innerH = H - pad.top - pad.bottom;

    var vals = points.map(function (p) { return p.value; }).filter(function (v) { return v != null && !isNaN(v); });
    if (target != null && !isNaN(target)) vals.push(target);

    var yMax = opts.yMax != null ? opts.yMax : (vals.length ? Math.max.apply(null, vals) : 10);
    var yMin = opts.yMin != null ? opts.yMin : 0;
    if (yMax <= yMin) yMax = yMin + 1;
    // add a little headroom
    if (opts.yMax == null) yMax = yMax + (yMax - yMin) * 0.1;

    var n = points.length;
    function x(i) { return n <= 1 ? pad.left + innerW / 2 : pad.left + (i / (n - 1)) * innerW; }
    function y(v) { return pad.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH; }

    var svg = [];
    svg.push('<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Progress over time chart">');

    // Y gridlines (4)
    var steps = 4;
    for (var g = 0; g <= steps; g++) {
      var v = yMin + (yMax - yMin) * (g / steps);
      var yy = y(v);
      svg.push('<line x1="' + pad.left + '" y1="' + yy.toFixed(1) + '" x2="' + (W - pad.right) + '" y2="' + yy.toFixed(1) + '" stroke="#e2e7f0" stroke-width="1" />');
      svg.push('<text x="' + (pad.left - 8) + '" y="' + (yy + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#667089">' + (Math.round(v * 10) / 10) + '</text>');
    }

    // Target line
    if (target != null && !isNaN(target)) {
      var ty = y(target);
      svg.push('<line x1="' + pad.left + '" y1="' + ty.toFixed(1) + '" x2="' + (W - pad.right) + '" y2="' + ty.toFixed(1) + '" stroke="#1f9d6b" stroke-width="2" stroke-dasharray="6 4" />');
      svg.push('<text x="' + (W - pad.right) + '" y="' + (ty - 6).toFixed(1) + '" text-anchor="end" font-size="11" fill="#1f9d6b" font-weight="600">Target ' + esc(target + (opts.unit || "")) + '</text>');
    }

    // Data path
    if (n > 0) {
      var d = "";
      points.forEach(function (p, i) {
        if (p.value == null || isNaN(p.value)) return;
        d += (d === "" ? "M" : "L") + x(i).toFixed(1) + " " + y(p.value).toFixed(1) + " ";
      });
      if (d) svg.push('<path d="' + d.trim() + '" fill="none" stroke="#3f6fe0" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />');

      // Points + x labels
      points.forEach(function (p, i) {
        if (p.value == null || isNaN(p.value)) return;
        svg.push('<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.value).toFixed(1) + '" r="4" fill="#3f6fe0" />');
        svg.push('<title>' + esc(p.date + ": " + p.value + (opts.unit || "")) + '</title>');
      });

      // X axis labels — show a handful to avoid crowding
      var labelEvery = Math.ceil(n / 6);
      points.forEach(function (p, i) {
        if (i % labelEvery !== 0 && i !== n - 1) return;
        var lbl = shortDate(p.date);
        svg.push('<text x="' + x(i).toFixed(1) + '" y="' + (H - pad.bottom + 18) + '" text-anchor="middle" font-size="10" fill="#667089">' + esc(lbl) + '</text>');
      });
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
