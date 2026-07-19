/* app.js — UI, routing and views for the Special Education Data Tracker. */
(function () {
  "use strict";

  var S = window.Store;
  var C = window.Charts;

  var state = { view: "dashboard", studentId: null };

  // ---- Utilities ------------------------------------------------------------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function fullName(s) { return (s.firstName + " " + s.lastName).trim() || "Unnamed student"; }
  function initials(s) {
    return ((s.firstName[0] || "") + (s.lastName[0] || "")).toUpperCase() || "?";
  }
  var AVATAR_COLORS = ["#3f6fe0", "#7c5cd6", "#1f9d6b", "#d98a1a", "#d8443c", "#2aa5b5", "#c2569b"];
  function colorFor(id) {
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[h];
  }
  function gradeLabel(g) {
    if (g === "" || g == null) return "";
    return g === "K" || g === "PK" ? g : "Gr " + g;
  }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    var parts = iso.split("-");
    if (parts.length < 3) return iso;
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[parseInt(parts[1], 10) - 1] + " " + parseInt(parts[2], 10) + ", " + parts[0];
  }
  function daysUntil(iso) {
    if (!iso) return null;
    var target = new Date(iso + "T00:00:00");
    var now = new Date(todayISO() + "T00:00:00");
    return Math.round((target - now) / (1000 * 60 * 60 * 24));
  }
  function options(list, selected) {
    return list.map(function (o) {
      var val = typeof o === "object" ? o.value : o;
      var label = typeof o === "object" ? o.label : o;
      return '<option value="' + esc(val) + '"' + (String(val) === String(selected) ? " selected" : "") + ">" + esc(label) + "</option>";
    }).join("");
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $("#toast") || (function () {
      var e = document.createElement("div");
      e.id = "toast"; e.className = "toast"; document.body.appendChild(e); return e;
    })();
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  // ---- Modal ----------------------------------------------------------------
  function openModal(title, bodyHTML, footHTML) {
    var root = $("#modal-root");
    root.innerHTML =
      '<div class="modal-backdrop" data-close="1">' +
        '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">' +
          '<div class="modal-head"><h3>' + esc(title) + '</h3><button class="icon-btn" data-close="1" aria-label="Close">×</button></div>' +
          '<div class="modal-body">' + bodyHTML + '</div>' +
          (footHTML ? '<div class="modal-foot">' + footHTML + '</div>' : '') +
        '</div>' +
      '</div>';
    var first = root.querySelector("input, select, textarea");
    if (first) first.focus();
  }
  function closeModal() { $("#modal-root").innerHTML = ""; }

  // ---- Router ---------------------------------------------------------------
  function go(view, studentId) {
    state.view = view;
    if (studentId !== undefined) state.studentId = studentId;
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    // tab highlight
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-view") === state.view);
    });
    var host = $("#view");
    if (state.view === "dashboard") host.innerHTML = renderDashboard();
    else if (state.view === "students") host.innerHTML = state.studentId ? renderStudentDetail(state.studentId) : renderStudents();
    else if (state.view === "data") host.innerHTML = renderData();
    else if (state.view === "behavior") host.innerHTML = renderBehavior();
    else if (state.view === "reports") host.innerHTML = renderReports();
    else if (state.view === "backup") host.innerHTML = renderBackup();
  }

  // ---- Dashboard ------------------------------------------------------------
  function renderDashboard() {
    var students = S.getStudents();
    if (!students.length) return emptyStateHTML();

    var goalCount = 0, dataCount = 0;
    students.forEach(function (s) { goalCount += s.goals.length; });
    S.getStudents(); // ensure loaded
    var behaviors = S.allBehaviors();

    // compliance alerts
    var alerts = [];
    students.forEach(function (s) {
      ["annualReview", "reevaluation"].forEach(function (k) {
        var iso = s.dates[k];
        var d = daysUntil(iso);
        if (d != null && d <= 60) {
          alerts.push({ student: s, kind: k === "annualReview" ? "Annual review" : "Re-evaluation", date: iso, days: d });
        }
      });
    });
    alerts.sort(function (a, b) { return a.days - b.days; });

    // count total progress points
    var totalPoints = 0;
    students.forEach(function (s) {
      s.goals.forEach(function (g) { totalPoints += S.progressForGoal(g.id).length; });
    });

    var html = '<div class="page-head"><div><h2>Dashboard</h2><p class="sub">Overview of your caseload — ' + fmtDate(todayISO()) + '</p></div>' +
      '<button class="btn primary" data-action="add-student">＋ Add student</button></div>';

    html += '<div class="grid cols-4 mb-2">' +
      stat(students.length, "Students", "primary") +
      stat(goalCount, "Active goals", "purple") +
      stat(totalPoints, "Data points logged", "success") +
      stat(behaviors.length, "Behavior logs", "warn") +
      '</div>';

    html += '<div class="grid cols-2">';

    // Alerts card
    html += '<div class="card"><h3>⏰ Upcoming compliance dates</h3>';
    if (!alerts.length) {
      html += '<p class="muted small">No annual reviews or re-evaluations due in the next 60 days. 🎉</p>';
    } else {
      html += alerts.map(function (a) {
        var chipClass = a.days < 0 ? "danger" : a.days <= 14 ? "danger" : a.days <= 30 ? "warn" : "primary";
        var label = a.days < 0 ? Math.abs(a.days) + "d overdue" : a.days === 0 ? "Today" : "in " + a.days + "d";
        return '<div class="alert-item"><div><a data-action="open-student" data-id="' + a.student.id + '" style="cursor:pointer">' + esc(fullName(a.student)) + '</a>' +
          '<div class="muted tiny">' + esc(a.kind) + ' · ' + fmtDate(a.date) + '</div></div>' +
          '<span class="chip ' + chipClass + '">' + label + '</span></div>';
      }).join("");
    }
    html += '</div>';

    // Recent behavior card
    html += '<div class="card"><h3>📋 Recent behavior logs</h3>';
    if (!behaviors.length) {
      html += '<p class="muted small">No behavior incidents logged yet.</p>';
    } else {
      html += behaviors.slice(0, 5).map(function (b) {
        var s = S.getStudent(b.studentId);
        return '<div class="alert-item"><div><strong class="small">' + esc(s ? fullName(s) : "—") + '</strong>' +
          '<div class="muted tiny">' + esc(b.behavior || "(behavior)") + '</div></div>' +
          '<span class="tiny muted nowrap">' + fmtDate(b.date) + '</span></div>';
      }).join("");
    }
    html += '</div>';

    html += '</div>'; // grid

    // Caseload quick list
    html += '<h3 class="section-title">Your caseload</h3><div class="grid cols-3">';
    html += students.map(studentCardHTML).join("");
    html += '</div>';

    return html;
  }

  function stat(num, label, accent) {
    return '<div class="stat accent-' + accent + '"><div class="num">' + num + '</div><div class="label">' + esc(label) + '</div></div>';
  }

  function studentCardHTML(s) {
    var activeGoals = s.goals.filter(function (g) { return g.status !== "met" && g.status !== "discontinued"; }).length;
    return '<div class="card pad-sm student-card" data-action="open-student" data-id="' + s.id + '">' +
      '<div class="avatar" style="background:' + colorFor(s.id) + '">' + esc(initials(s)) + '</div>' +
      '<div><div><strong>' + esc(fullName(s)) + '</strong></div>' +
      '<div class="muted tiny">' + [gradeLabel(s.grade), s.disability].filter(Boolean).map(esc).join(" · ") + '</div>' +
      '<div class="tiny" style="margin-top:4px"><span class="chip primary">' + activeGoals + ' goals</span></div>' +
      '</div></div>';
  }

  function emptyStateHTML() {
    return '<div class="empty"><div class="big">🎯</div>' +
      '<h2>Welcome to Sheena</h2>' +
      '<p>Track IEP goals, progress data, behavior, and accommodations — all stored privately on this device.</p>' +
      '<div class="flex" style="justify-content:center;margin-top:16px">' +
      '<button class="btn primary" data-action="add-student">＋ Add your first student</button>' +
      '<button class="btn" data-action="load-sample">Load sample data to explore</button>' +
      '</div></div>';
  }

  // ---- Students list --------------------------------------------------------
  function renderStudents() {
    var students = S.getStudents();
    var html = '<div class="page-head"><div><h2>Students</h2><p class="sub">' + students.length + ' on your caseload</p></div>' +
      '<button class="btn primary" data-action="add-student">＋ Add student</button></div>';
    if (!students.length) return html + emptyStateHTML();
    html += '<div class="grid cols-3">' + students.map(studentCardHTML).join("") + '</div>';
    return html;
  }

  // ---- Student detail -------------------------------------------------------
  function renderStudentDetail(id) {
    var s = S.getStudent(id);
    if (!s) return '<p>Student not found.</p>';

    var html = '<button class="back-link" data-action="back-students">‹ All students</button>';

    // Header card
    html += '<div class="card mb-2"><div class="flex-between wrap">' +
      '<div class="flex" style="gap:14px">' +
      '<div class="avatar" style="background:' + colorFor(s.id) + ';width:56px;height:56px;font-size:20px">' + esc(initials(s)) + '</div>' +
      '<div><h2 style="margin:0">' + esc(fullName(s)) + '</h2>' +
      '<div class="muted small">' + [gradeLabel(s.grade), s.disability, s.caseManager ? "Case mgr: " + s.caseManager : ""].filter(Boolean).map(esc).join(" · ") + '</div></div>' +
      '</div>' +
      '<div class="flex gap-sm no-print"><button class="btn sm" data-action="edit-student" data-id="' + s.id + '">Edit</button>' +
      '<button class="btn sm danger" data-action="delete-student" data-id="' + s.id + '">Delete</button></div>' +
      '</div>';

    // Key dates
    html += '<hr class="sep"><div class="grid cols-2">';
    html += dateBox("Annual review", s.dates.annualReview);
    html += dateBox("Re-evaluation", s.dates.reevaluation);
    html += '</div></div>';

    // Goals
    html += '<div class="flex-between"><h3 class="section-title" style="margin:0">IEP Goals &amp; objectives</h3>' +
      '<button class="btn sm primary no-print" data-action="add-goal" data-id="' + s.id + '">＋ Add goal</button></div>';
    if (!s.goals.length) {
      html += '<div class="card"><p class="muted small mb-0">No goals yet. Add an IEP goal to start collecting data.</p></div>';
    } else {
      html += '<div class="grid" style="gap:14px">' + s.goals.map(function (g) { return goalCardHTML(s, g); }).join("") + '</div>';
    }

    // Accommodations
    html += '<div class="flex-between"><h3 class="section-title">Accommodations</h3>' +
      '<button class="btn sm no-print" data-action="add-accom" data-id="' + s.id + '">＋ Add</button></div>';
    html += '<div class="card">';
    if (!s.accommodations.length) {
      html += '<p class="muted small mb-0">No accommodations recorded.</p>';
    } else {
      html += '<div class="table-wrap"><table><tbody>' + s.accommodations.map(function (a) {
        return '<tr><td class="nowrap"><span class="chip">' + esc(a.category) + '</span></td><td>' + esc(a.text) + '</td>' +
          '<td class="right no-print"><button class="btn sm ghost" data-action="del-accom" data-id="' + s.id + '" data-acc="' + a.id + '">Remove</button></td></tr>';
      }).join("") + '</tbody></table></div>';
    }
    html += '</div>';

    // Behavior for this student
    var beh = S.behaviorsForStudent(s.id);
    html += '<div class="flex-between"><h3 class="section-title">Behavior logs (' + beh.length + ')</h3>' +
      '<button class="btn sm no-print" data-action="add-behavior" data-id="' + s.id + '">＋ Log incident</button></div>';
    html += '<div class="card">';
    if (!beh.length) {
      html += '<p class="muted small mb-0">No behavior incidents logged.</p>';
    } else {
      html += behaviorTableHTML(beh.slice(0, 8), false);
      if (beh.length > 8) html += '<p class="tiny muted mt-1 mb-0">Showing 8 most recent. See the Behavior tab for all.</p>';
    }
    html += '</div>';

    return html;
  }

  function dateBox(label, iso) {
    var d = daysUntil(iso);
    var chip = "";
    if (d != null) {
      var cls = d < 0 ? "danger" : d <= 30 ? "warn" : "success";
      var txt = d < 0 ? Math.abs(d) + "d overdue" : d === 0 ? "today" : "in " + d + "d";
      chip = ' <span class="chip ' + cls + '">' + txt + '</span>';
    }
    return '<div class="card pad-sm"><div class="muted tiny">' + esc(label) + '</div>' +
      '<div style="margin-top:3px"><strong>' + fmtDate(iso) + '</strong>' + chip + '</div></div>';
  }

  function goalCardHTML(s, g) {
    var mt = S.MEASUREMENT_TYPES[g.measurement] || S.MEASUREMENT_TYPES.percent;
    var pts = S.progressForGoal(g.id);
    var latest = pts.length ? S.valueOf(pts[pts.length - 1], g) : null;
    var statusChip = g.status === "met" ? '<span class="chip success">Met</span>' :
      g.status === "discontinued" ? '<span class="chip">Discontinued</span>' : '<span class="chip primary">Active</span>';

    var latestTxt = latest != null ? latest + (mt.unit || "") : "—";
    if (g.measurement === "prompt" && latest != null) {
      var pl = S.PROMPT_LEVELS.filter(function (p) { return p.value === latest; })[0];
      latestTxt = pl ? pl.label : latest;
    }

    var html = '<div class="card"><div class="flex-between wrap" style="align-items:flex-start">' +
      '<div style="flex:1;min-width:200px"><span class="chip purple">' + esc(g.area) + '</span> ' + statusChip +
      '<p style="margin:8px 0 4px">' + esc(g.description) + '</p>' +
      '<div class="muted tiny">Baseline: ' + esc(g.baseline || "—") + ' · Measure: ' + esc(mt.label) +
      (g.target != null ? ' · Target: ' + esc(g.target + (mt.unit || "")) : "") + '</div></div>' +
      '<div class="right no-print" style="min-width:120px">' +
      '<div class="tiny muted">Latest</div><div style="font-size:20px;font-weight:700">' + esc(latestTxt) + '</div>' +
      '<div class="flex gap-sm" style="justify-content:flex-end;margin-top:6px">' +
      '<button class="btn sm primary" data-action="quick-data" data-id="' + s.id + '" data-goal="' + g.id + '">＋ Data</button>' +
      '</div></div></div>';

    // mini chart
    if (pts.length) {
      var chartPts = pts.map(function (p) { return { date: p.date, value: S.valueOf(p, g) }; });
      var opts = { unit: mt.unit };
      if (g.measurement === "percent") { opts.yMax = 100; opts.yMin = 0; }
      if (g.measurement === "prompt" || g.measurement === "rating") { opts.yMax = 5; opts.yMin = 0; }
      html += '<div class="chart-wrap mt-1">' + C.lineChart(chartPts, g.target, opts) + '</div>';
      html += '<div class="flex-between no-print"><span class="tiny muted">' + pts.length + ' data point' + (pts.length === 1 ? "" : "s") + '</span>' +
        '<span><button class="btn sm ghost" data-action="view-goal-data" data-id="' + s.id + '" data-goal="' + g.id + '">View/edit data</button> ' +
        '<button class="btn sm ghost" data-action="edit-goal" data-id="' + s.id + '" data-goal="' + g.id + '">Edit goal</button> ' +
        '<button class="btn sm ghost" data-action="delete-goal" data-id="' + s.id + '" data-goal="' + g.id + '">Delete</button></span></div>';
    } else {
      html += '<div class="flex-between no-print mt-1"><span class="tiny muted">No data yet</span>' +
        '<span><button class="btn sm ghost" data-action="edit-goal" data-id="' + s.id + '" data-goal="' + g.id + '">Edit goal</button> ' +
        '<button class="btn sm ghost" data-action="delete-goal" data-id="' + s.id + '" data-goal="' + g.id + '">Delete</button></span></div>';
    }

    html += '</div>';
    return html;
  }

  // ---- Collect Data tab -----------------------------------------------------
  function renderData() {
    var goals = S.allGoals();
    var html = '<div class="page-head"><div><h2>Collect Data</h2><p class="sub">Quickly log a progress data point against any goal</p></div></div>';
    if (!goals.length) {
      return html + '<div class="card"><p class="muted mb-0">Add a student and at least one goal first.</p></div>';
    }
    html += '<div class="card" style="max-width:640px">' + dataFormHTML(null, null) + '</div>';

    // recent entries
    var students = S.getStudents();
    var recent = [];
    students.forEach(function (s) {
      s.goals.forEach(function (g) {
        S.progressForGoal(g.id).forEach(function (p) { recent.push({ s: s, g: g, p: p }); });
      });
    });
    recent.sort(function (a, b) { return a.p.date < b.p.date ? 1 : -1; });
    html += '<h3 class="section-title">Recent entries</h3><div class="card">';
    if (!recent.length) {
      html += '<p class="muted small mb-0">No data logged yet.</p>';
    } else {
      html += '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Student</th><th>Goal area</th><th>Value</th><th></th></tr></thead><tbody>';
      html += recent.slice(0, 15).map(function (r) {
        var mt = S.MEASUREMENT_TYPES[r.g.measurement] || {};
        var val = S.valueOf(r.p, r.g);
        return '<tr><td class="nowrap">' + fmtDate(r.p.date) + '</td><td>' + esc(fullName(r.s)) + '</td>' +
          '<td><span class="chip purple">' + esc(r.g.area) + '</span></td>' +
          '<td><strong>' + esc(val != null ? val + (mt.unit || "") : "—") + '</strong>' +
          (r.p.total ? ' <span class="tiny muted">(' + r.p.score + "/" + r.p.total + ')</span>' : "") + '</td>' +
          '<td class="right"><button class="btn sm ghost" data-action="del-progress" data-pid="' + r.p.id + '">Delete</button></td></tr>';
      }).join("");
      html += '</tbody></table></div>';
    }
    html += '</div>';
    return html;
  }

  // Build the data entry form. If studentId/goalId provided, preselect + lock student.
  function dataFormHTML(studentId, goalId) {
    var students = S.getStudents();
    var studentOpts = students.map(function (s) { return { value: s.id, label: fullName(s) }; });
    var sid = studentId || (students[0] && students[0].id);
    var current = S.getStudent(sid);
    var goalOpts = current ? current.goals.map(function (g) { return { value: g.id, label: g.area + " — " + truncate(g.description, 40) }; }) : [];
    var gid = goalId || (current && current.goals[0] && current.goals[0].id);
    var goal = current ? current.goals.filter(function (g) { return g.id === gid; })[0] : null;

    return '<form data-form="data-entry">' +
      '<div class="form-grid">' +
      '<label class="field full"><span>Student</span><select name="studentId" data-action="data-student-change">' + options(studentOpts, sid) + '</select></label>' +
      '<label class="field full"><span>Goal</span><select name="goalId" data-action="data-goal-change">' + options(goalOpts, gid) + '</select></label>' +
      '<label class="field"><span>Date</span><input type="date" name="date" value="' + todayISO() + '" /></label>' +
      scoreInputsHTML(goal) +
      '<label class="field full"><span>Notes (optional)</span><textarea name="notes" placeholder="Prompts used, observations, conditions…"></textarea></label>' +
      '</div>' +
      '<button type="submit" class="btn primary">Save data point</button>' +
      '</form>';
  }

  // Score inputs depend on measurement type.
  function scoreInputsHTML(goal) {
    var m = goal ? goal.measurement : "percent";
    if (m === "percent") {
      return '<label class="field"><span># correct</span><input type="number" name="score" min="0" step="1" placeholder="e.g. 16" /></label>' +
        '<label class="field"><span># of trials</span><input type="number" name="total" min="1" step="1" placeholder="e.g. 20" /></label>';
    }
    if (m === "prompt") {
      return '<label class="field"><span>Independence level</span><select name="score">' + options(S.PROMPT_LEVELS, 5) + '</select></label>';
    }
    if (m === "duration") {
      return '<label class="field"><span>Minutes</span><input type="number" name="score" min="0" step="0.5" placeholder="e.g. 7" /></label>';
    }
    if (m === "rating") {
      return '<label class="field"><span>Rating (0–5)</span><input type="number" name="score" min="0" max="5" step="1" placeholder="0–5" /></label>';
    }
    // frequency
    return '<label class="field"><span>Count</span><input type="number" name="score" min="0" step="1" placeholder="e.g. 4" /></label>';
  }

  function truncate(s, n) { s = s || ""; return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  // ---- Behavior tab ---------------------------------------------------------
  function renderBehavior() {
    var students = S.getStudents();
    var behaviors = S.allBehaviors();
    var html = '<div class="page-head"><div><h2>Behavior Tracking (ABC)</h2><p class="sub">Antecedent → Behavior → Consequence logs</p></div>' +
      (students.length ? '<button class="btn primary" data-action="add-behavior">＋ Log incident</button>' : '') + '</div>';

    if (!students.length) {
      return html + '<div class="card"><p class="muted mb-0">Add a student first to log behavior.</p></div>';
    }

    // Frequency summary by student
    var counts = {};
    behaviors.forEach(function (b) { counts[b.studentId] = (counts[b.studentId] || 0) + 1; });
    var barData = students.filter(function (s) { return counts[s.id]; }).map(function (s) {
      return { label: fullName(s), value: counts[s.id], color: colorFor(s.id) };
    }).sort(function (a, b) { return b.value - a.value; });

    html += '<div class="grid cols-2 mb-2">';
    html += '<div class="card"><h3>Incidents by student</h3>' + C.barChart(barData) + '</div>';
    // intensity breakdown
    var byIntensity = { Low: 0, Medium: 0, High: 0 };
    behaviors.forEach(function (b) { if (byIntensity[b.intensity] != null) byIntensity[b.intensity]++; });
    html += '<div class="card"><h3>By intensity</h3>' + C.barChart([
      { label: "Low", value: byIntensity.Low, color: "#1f9d6b" },
      { label: "Medium", value: byIntensity.Medium, color: "#d98a1a" },
      { label: "High", value: byIntensity.High, color: "#d8443c" }
    ]) + '</div>';
    html += '</div>';

    html += '<h3 class="section-title">All incidents (' + behaviors.length + ')</h3><div class="card">';
    if (!behaviors.length) html += '<p class="muted small mb-0">No incidents logged yet.</p>';
    else html += behaviorTableHTML(behaviors, true);
    html += '</div>';
    return html;
  }

  function behaviorTableHTML(list, showStudent) {
    var head = '<thead><tr><th>Date/Time</th>' + (showStudent ? '<th>Student</th>' : '') +
      '<th>Antecedent</th><th>Behavior</th><th>Consequence</th><th>Intensity</th><th class="no-print"></th></tr></thead>';
    var rows = list.map(function (b) {
      var s = showStudent ? S.getStudent(b.studentId) : null;
      var intChip = b.intensity ? '<span class="chip ' + (b.intensity === "High" ? "danger" : b.intensity === "Medium" ? "warn" : "success") + '">' + esc(b.intensity) + '</span>' : "—";
      return '<tr><td class="nowrap tiny">' + fmtDate(b.date) + (b.time ? '<br>' + esc(b.time) : "") + '</td>' +
        (showStudent ? '<td class="nowrap">' + esc(s ? fullName(s) : "—") + '</td>' : '') +
        '<td class="small">' + esc(b.antecedent || "—") + '</td>' +
        '<td class="small"><strong>' + esc(b.behavior || "—") + '</strong>' + (b.setting ? '<br><span class="tiny muted">' + esc(b.setting) + '</span>' : "") + '</td>' +
        '<td class="small">' + esc(b.consequence || "—") + '</td>' +
        '<td class="nowrap">' + intChip + (b.durationMin != null ? '<br><span class="tiny muted">' + b.durationMin + ' min</span>' : "") + '</td>' +
        '<td class="right no-print"><button class="btn sm ghost" data-action="del-behavior" data-bid="' + b.id + '">✕</button></td></tr>';
    }).join("");
    return '<div class="table-wrap"><table>' + head + '<tbody>' + rows + '</tbody></table></div>';
  }

  // ---- Reports tab ----------------------------------------------------------
  function renderReports() {
    var students = S.getStudents();
    var html = '<div class="page-head"><div><h2>Reports</h2><p class="sub">Progress summaries you can print or save as PDF</p></div>' +
      (students.length ? '<button class="btn no-print" onclick="window.print()">🖨 Print / Save PDF</button>' : '') + '</div>';
    if (!students.length) return html + '<div class="card"><p class="muted mb-0">No students yet.</p></div>';

    html += '<label class="field no-print" style="max-width:320px"><span>Choose a student report</span>' +
      '<select data-action="report-student">' + options([{ value: "", label: "— All students (summary) —" }].concat(students.map(function (s) { return { value: s.id, label: fullName(s) }; })), state.reportId || "") + '</select></label>';

    if (state.reportId) {
      html += studentReportHTML(state.reportId);
    } else {
      // caseload summary
      html += '<div class="card"><h3>Caseload progress summary</h3><div class="table-wrap"><table>' +
        '<thead><tr><th>Student</th><th>Goal area</th><th>Baseline</th><th>Target</th><th>Latest</th><th>Data points</th></tr></thead><tbody>';
      var rows = "";
      students.forEach(function (s) {
        if (!s.goals.length) {
          rows += '<tr><td>' + esc(fullName(s)) + '</td><td colspan="5" class="muted small">No goals</td></tr>';
        }
        s.goals.forEach(function (g, i) {
          var mt = S.MEASUREMENT_TYPES[g.measurement] || {};
          var pts = S.progressForGoal(g.id);
          var latest = pts.length ? S.valueOf(pts[pts.length - 1], g) : null;
          rows += '<tr><td>' + (i === 0 ? esc(fullName(s)) : "") + '</td>' +
            '<td><span class="chip purple">' + esc(g.area) + '</span></td>' +
            '<td class="small">' + esc(g.baseline || "—") + '</td>' +
            '<td>' + esc(g.target != null ? g.target + (mt.unit || "") : "—") + '</td>' +
            '<td><strong>' + esc(latest != null ? latest + (mt.unit || "") : "—") + '</strong></td>' +
            '<td>' + pts.length + '</td></tr>';
        });
      });
      html += rows + '</tbody></table></div></div>';
    }
    return html;
  }

  function studentReportHTML(id) {
    var s = S.getStudent(id);
    if (!s) return "";
    var html = '<div class="card mt-2"><div class="flex-between"><div>' +
      '<h2 style="margin:0">' + esc(fullName(s)) + '</h2>' +
      '<div class="muted small">' + [gradeLabel(s.grade), s.disability, s.caseManager].filter(Boolean).map(esc).join(" · ") + '</div>' +
      '<div class="muted tiny mt-1">Progress report generated ' + fmtDate(todayISO()) + '</div></div></div>';

    html += '<div class="grid cols-2 mt-2">' + dateBox("Annual review", s.dates.annualReview) + dateBox("Re-evaluation", s.dates.reevaluation) + '</div>';

    s.goals.forEach(function (g) {
      var mt = S.MEASUREMENT_TYPES[g.measurement] || {};
      var pts = S.progressForGoal(g.id);
      html += '<hr class="sep"><div><span class="chip purple">' + esc(g.area) + '</span>' +
        '<p style="margin:8px 0 4px"><strong>' + esc(g.description) + '</strong></p>' +
        '<div class="muted tiny mb-2">Baseline: ' + esc(g.baseline || "—") + ' · Target: ' + esc(g.target != null ? g.target + (mt.unit || "") : "—") + ' · ' + pts.length + ' data points</div>';
      if (pts.length) {
        var chartPts = pts.map(function (p) { return { date: p.date, value: S.valueOf(p, g) }; });
        var opts = { unit: mt.unit };
        if (g.measurement === "percent") { opts.yMax = 100; opts.yMin = 0; }
        if (g.measurement === "prompt" || g.measurement === "rating") { opts.yMax = 5; opts.yMin = 0; }
        html += '<div class="chart-wrap">' + C.lineChart(chartPts, g.target, opts) + '</div>';
      } else {
        html += '<p class="muted small">No data collected yet.</p>';
      }
      html += '</div>';
    });

    if (s.accommodations.length) {
      html += '<hr class="sep"><h3>Accommodations</h3><ul>';
      s.accommodations.forEach(function (a) { html += '<li><strong>' + esc(a.category) + ':</strong> ' + esc(a.text) + '</li>'; });
      html += '</ul>';
    }
    html += '</div>';
    return html;
  }

  // ---- Backup tab -----------------------------------------------------------
  function renderBackup() {
    var students = S.getStudents();
    var html = '<div class="page-head"><div><h2>Backup &amp; Data</h2><p class="sub">Your data lives only in this browser — keep safe copies</p></div></div>';

    html += '<div class="card mb-2" style="border-left:4px solid var(--warn)"><h3>⚠️ Important</h3>' +
      '<p class="mb-0 small">All student data is stored in this browser on this device only. It is never uploaded. ' +
      'If you clear your browser data, switch devices, or the browser cache is wiped, <strong>the data will be lost</strong>. ' +
      'Export a backup file regularly and after every data session.</p></div>';

    html += '<div class="grid cols-2">';

    html += '<div class="card"><h3>⬇ Export backup</h3>' +
      '<p class="small muted">Download all students, goals, data, and behavior logs as a single file.</p>' +
      '<button class="btn primary" data-action="export">Download backup (.json)</button></div>';

    html += '<div class="card"><h3>⬆ Import backup</h3>' +
      '<p class="small muted">Restore from a backup file. Choose to merge with or replace current data.</p>' +
      '<input type="file" id="import-file" accept="application/json,.json" class="mb-2" />' +
      '<div class="flex gap-sm"><button class="btn" data-action="import" data-mode="merge">Merge</button>' +
      '<button class="btn danger" data-action="import" data-mode="replace">Replace all</button></div></div>';

    html += '</div>';

    html += '<h3 class="section-title">Other</h3><div class="card"><div class="flex gap-sm wrap">';
    if (S.isEmpty()) html += '<button class="btn" data-action="load-sample">Load sample data</button>';
    html += '<button class="btn danger" data-action="clear-all">Delete ALL data</button>';
    html += '</div></div>';

    var count = students.length;
    html += '<p class="tiny muted mt-2">Currently storing ' + count + ' student' + (count === 1 ? "" : "s") + ' in this browser.</p>';
    return html;
  }

  // ---- Forms: student, goal, accommodation, behavior ------------------------
  function studentForm(s) {
    s = s || {};
    var dates = s.dates || {};
    return '<form data-form="student" data-id="' + (s.id || "") + '">' +
      '<div class="form-grid">' +
      '<label class="field"><span>First name</span><input name="firstName" value="' + esc(s.firstName || "") + '" required /></label>' +
      '<label class="field"><span>Last name</span><input name="lastName" value="' + esc(s.lastName || "") + '" /></label>' +
      '<label class="field"><span>Grade</span><input name="grade" value="' + esc(s.grade || "") + '" placeholder="K, 1, 2…" /></label>' +
      '<label class="field"><span>Case manager</span><input name="caseManager" value="' + esc(s.caseManager || "") + '" /></label>' +
      '<label class="field full"><span>Disability category</span><select name="disability">' +
        '<option value="">— select —</option>' + options(S.DISABILITY_CATEGORIES, s.disability) + '</select></label>' +
      '<label class="field"><span>Annual review date</span><input type="date" name="annualReview" value="' + esc(dates.annualReview || "") + '" /></label>' +
      '<label class="field"><span>Re-evaluation date</span><input type="date" name="reevaluation" value="' + esc(dates.reevaluation || "") + '" /></label>' +
      '</div></form>';
  }

  function goalForm(studentId, g) {
    g = g || {};
    return '<form data-form="goal" data-id="' + studentId + '" data-goal="' + (g.id || "") + '">' +
      '<div class="form-grid">' +
      '<label class="field"><span>Goal area</span><select name="area">' + options(S.GOAL_AREAS, g.area) + '</select></label>' +
      '<label class="field"><span>Status</span><select name="status">' + options([
        { value: "active", label: "Active" }, { value: "met", label: "Met" }, { value: "discontinued", label: "Discontinued" }
      ], g.status || "active") + '</select></label>' +
      '<label class="field full"><span>Goal / objective statement</span><textarea name="description" placeholder="Given…, [Student] will…, with __% accuracy across __ sessions.">' + esc(g.description || "") + '</textarea></label>' +
      '<label class="field"><span>Baseline</span><input name="baseline" value="' + esc(g.baseline || "") + '" placeholder="e.g. 62% accuracy" /></label>' +
      '<label class="field"><span>Measurement</span><select name="measurement">' + options(
        Object.keys(S.MEASUREMENT_TYPES).map(function (k) { return { value: k, label: S.MEASUREMENT_TYPES[k].label }; }), g.measurement || "percent") + '</select></label>' +
      '<label class="field"><span>Target (number)</span><input type="number" step="0.1" name="target" value="' + esc(g.target != null ? g.target : "") + '" placeholder="e.g. 90" /></label>' +
      '</div>' +
      '<p class="tiny muted">Tip: for "Percent" use the target % (e.g. 90). For "Prompt level" the max is 5 = Independent.</p>' +
      '</form>';
  }

  function accomForm(studentId) {
    return '<form data-form="accom" data-id="' + studentId + '">' +
      '<label class="field"><span>Category</span><select name="category">' + options(S.ACCOMMODATION_CATEGORIES) + '</select></label>' +
      '<label class="field"><span>Accommodation</span><textarea name="text" placeholder="e.g. Extended time (1.5x) on assessments" required></textarea></label>' +
      '</form>';
  }

  function behaviorForm(studentId) {
    var students = S.getStudents();
    var studentOpts = students.map(function (s) { return { value: s.id, label: fullName(s) }; });
    return '<form data-form="behavior">' +
      '<div class="form-grid">' +
      '<label class="field full"><span>Student</span><select name="studentId">' + options(studentOpts, studentId || (students[0] && students[0].id)) + '</select></label>' +
      '<label class="field"><span>Date</span><input type="date" name="date" value="' + todayISO() + '" /></label>' +
      '<label class="field"><span>Time</span><input type="time" name="time" /></label>' +
      '<label class="field full"><span>Setting / activity</span><input name="setting" placeholder="e.g. Math — independent work" /></label>' +
      '<label class="field full"><span>Antecedent (what happened before)</span><textarea name="antecedent" placeholder="What was going on right before?"></textarea></label>' +
      '<label class="field full"><span>Behavior (what the student did)</span><textarea name="behavior" placeholder="Observable, measurable description" required></textarea></label>' +
      '<label class="field full"><span>Consequence (what happened after)</span><textarea name="consequence" placeholder="How was it responded to?"></textarea></label>' +
      '<label class="field"><span>Intensity</span><select name="intensity"><option value="">—</option>' + options(S.BEHAVIOR_INTENSITY) + '</select></label>' +
      '<label class="field"><span>Duration (min)</span><input type="number" name="durationMin" min="0" step="0.5" /></label>' +
      '<label class="field full"><span>Notes</span><textarea name="notes"></textarea></label>' +
      '</div></form>';
  }

  function readForm(formEl) {
    var data = {};
    Array.prototype.forEach.call(formEl.elements, function (el) {
      if (el.name) data[el.name] = el.value;
    });
    return data;
  }

  // Goal data list modal (view/edit/delete individual points)
  function goalDataModal(studentId, goalId) {
    var s = S.getStudent(studentId);
    var g = S.getGoal(studentId, goalId);
    if (!g) return;
    var mt = S.MEASUREMENT_TYPES[g.measurement] || {};
    var pts = S.progressForGoal(goalId).slice().reverse();
    var body = '<p class="small muted">' + esc(fullName(s)) + ' · ' + esc(g.area) + '</p>';
    if (!pts.length) {
      body += '<p class="muted">No data points yet.</p>';
    } else {
      body += '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Value</th><th>Notes</th><th></th></tr></thead><tbody>';
      body += pts.map(function (p) {
        var v = S.valueOf(p, g);
        return '<tr><td class="nowrap">' + fmtDate(p.date) + '</td>' +
          '<td><strong>' + esc(v != null ? v + (mt.unit || "") : "—") + '</strong>' + (p.total ? ' <span class="tiny muted">(' + p.score + "/" + p.total + ')</span>' : "") + '</td>' +
          '<td class="small">' + esc(p.notes || "—") + '</td>' +
          '<td class="right"><button class="btn sm ghost" data-action="del-progress-modal" data-pid="' + p.id + '" data-id="' + studentId + '" data-goal="' + goalId + '">✕</button></td></tr>';
      }).join("");
      body += '</tbody></table></div>';
    }
    openModal("Data points", body, '<button class="btn" data-close="1">Close</button>');
  }

  // ---- Actions --------------------------------------------------------------
  function download(filename, text) {
    var blob = new Blob([text], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  var actions = {
    "add-student": function () {
      openModal("Add student", studentForm(),
        '<button class="btn" data-close="1">Cancel</button><button class="btn primary" data-submit="student">Save</button>');
    },
    "edit-student": function (t) {
      openModal("Edit student", studentForm(S.getStudent(t.getAttribute("data-id"))),
        '<button class="btn" data-close="1">Cancel</button><button class="btn primary" data-submit="student">Save</button>');
    },
    "delete-student": function (t) {
      var s = S.getStudent(t.getAttribute("data-id"));
      if (!s) return;
      if (confirm("Delete " + fullName(s) + " and ALL their goals, data, and behavior logs? This cannot be undone.")) {
        S.deleteStudent(s.id);
        toast("Student deleted");
        go("students", null);
      }
    },
    "open-student": function (t) { go("students", t.getAttribute("data-id")); },
    "back-students": function () { go("students", null); },
    "add-goal": function (t) {
      openModal("Add IEP goal", goalForm(t.getAttribute("data-id")),
        '<button class="btn" data-close="1">Cancel</button><button class="btn primary" data-submit="goal">Save</button>');
    },
    "edit-goal": function (t) {
      var sid = t.getAttribute("data-id"), gid = t.getAttribute("data-goal");
      openModal("Edit goal", goalForm(sid, S.getGoal(sid, gid)),
        '<button class="btn" data-close="1">Cancel</button><button class="btn primary" data-submit="goal">Save</button>');
    },
    "delete-goal": function (t) {
      var sid = t.getAttribute("data-id"), gid = t.getAttribute("data-goal");
      if (confirm("Delete this goal and all its data points?")) {
        S.deleteGoal(sid, gid); toast("Goal deleted"); render();
      }
    },
    "add-accom": function (t) {
      openModal("Add accommodation", accomForm(t.getAttribute("data-id")),
        '<button class="btn" data-close="1">Cancel</button><button class="btn primary" data-submit="accom">Save</button>');
    },
    "del-accom": function (t) {
      S.deleteAccommodation(t.getAttribute("data-id"), t.getAttribute("data-acc"));
      toast("Removed"); render();
    },
    "quick-data": function (t) {
      var sid = t.getAttribute("data-id"), gid = t.getAttribute("data-goal");
      openModal("Log data point", '<div class="card" style="border:none;box-shadow:none;padding:0">' + dataFormHTML(sid, gid) + '</div>', null);
    },
    "view-goal-data": function (t) {
      goalDataModal(t.getAttribute("data-id"), t.getAttribute("data-goal"));
    },
    "add-behavior": function (t) {
      openModal("Log behavior incident (ABC)", behaviorForm(t ? t.getAttribute("data-id") : null),
        '<button class="btn" data-close="1">Cancel</button><button class="btn primary" data-submit="behavior">Save</button>');
    },
    "del-behavior": function (t) {
      if (confirm("Delete this behavior log?")) { S.deleteBehavior(t.getAttribute("data-bid")); toast("Deleted"); render(); }
    },
    "del-progress": function (t) {
      if (confirm("Delete this data point?")) { S.deleteProgress(t.getAttribute("data-pid")); toast("Deleted"); render(); }
    },
    "del-progress-modal": function (t) {
      S.deleteProgress(t.getAttribute("data-pid"));
      toast("Deleted");
      goalDataModal(t.getAttribute("data-id"), t.getAttribute("data-goal"));
      // refresh underlying view too
      var host = $("#view"); if (state.view === "students") host.innerHTML = renderStudentDetail(state.studentId);
    },
    "load-sample": function () {
      if (!S.isEmpty() && !confirm("Load sample data? This adds example students.")) return;
      S.loadSampleData(); toast("Sample data loaded"); go("dashboard");
    },
    "export": function () {
      download("sheena-backup-" + todayISO() + ".json", S.exportJSON());
      toast("Backup downloaded");
    },
    "import": function (t) {
      var mode = t.getAttribute("data-mode");
      var input = $("#import-file");
      if (!input || !input.files || !input.files[0]) { alert("Choose a backup file first."); return; }
      if (mode === "replace" && !confirm("Replace ALL current data with the file's contents? This cannot be undone.")) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          S.importJSON(reader.result, mode);
          toast(mode === "replace" ? "Data replaced" : "Data merged");
          go("dashboard");
        } catch (e) {
          alert("Import failed: " + e.message);
        }
      };
      reader.readAsText(input.files[0]);
    },
    "clear-all": function () {
      if (confirm("Delete ALL data permanently? Export a backup first if unsure.") &&
          confirm("Are you absolutely sure? Everything will be erased.")) {
        S.clearAll(); toast("All data deleted"); go("dashboard");
      }
    }
  };

  // Form submit handlers (from modal footer buttons)
  var submitters = {
    student: function () {
      var form = $('form[data-form="student"]');
      var d = readForm(form);
      if (!d.firstName.trim()) { alert("First name is required."); return; }
      var id = form.getAttribute("data-id");
      if (id) { S.updateStudent(id, d); toast("Student updated"); }
      else { var ns = S.addStudent(d); id = ns.id; toast("Student added"); }
      closeModal();
      go("students", id);
    },
    goal: function () {
      var form = $('form[data-form="goal"]');
      var d = readForm(form);
      if (!d.description.trim()) { alert("Goal statement is required."); return; }
      var sid = form.getAttribute("data-id"), gid = form.getAttribute("data-goal");
      if (gid) S.updateGoal(sid, gid, d); else S.addGoal(sid, d);
      closeModal(); toast("Goal saved"); render();
    },
    accom: function () {
      var form = $('form[data-form="accom"]');
      var d = readForm(form);
      if (!d.text.trim()) { alert("Please describe the accommodation."); return; }
      S.addAccommodation(form.getAttribute("data-id"), d);
      closeModal(); toast("Accommodation added"); render();
    },
    behavior: function () {
      var form = $('form[data-form="behavior"]');
      var d = readForm(form);
      if (!d.behavior.trim()) { alert("Please describe the behavior."); return; }
      S.addBehavior(d);
      closeModal(); toast("Incident logged"); render();
    }
  };

  // ---- Global event wiring --------------------------------------------------
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-action]");
    if (t) {
      var action = t.getAttribute("data-action");
      if (actions[action]) { e.preventDefault(); actions[action](t); return; }
    }
    var submitBtn = e.target.closest("[data-submit]");
    if (submitBtn) { e.preventDefault(); submitters[submitBtn.getAttribute("data-submit")](); return; }
    if (e.target.closest("[data-close]")) { e.preventDefault(); closeModal(); return; }
  });

  // Tab clicks
  document.querySelectorAll(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      state.studentId = null; state.reportId = null;
      go(tab.getAttribute("data-view"));
    });
  });

  // Change events (dynamic form fields, report selector)
  document.addEventListener("change", function (e) {
    var el = e.target;
    var action = el.getAttribute("data-action");
    if (action === "data-student-change" || action === "data-goal-change") {
      // rebuild the data form preserving selection
      var form = el.closest("form");
      var sid = form.querySelector('[name="studentId"]').value;
      var gid = action === "data-student-change" ? null : form.querySelector('[name="goalId"]').value;
      var wrap = form.parentNode;
      wrap.innerHTML = dataFormHTML(sid, gid);
      return;
    }
    if (action === "report-student") {
      state.reportId = el.value;
      render();
      return;
    }
  });

  // Form submit (Enter key / native submit) for the data-entry form
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (form.getAttribute("data-form") === "data-entry") {
      e.preventDefault();
      var d = readForm(form);
      if (!d.goalId) { alert("Select a goal."); return; }
      if (d.score === "" && d.total === "") { alert("Enter a value."); return; }
      S.addProgress(d);
      toast("Data point saved");
      closeModal();
      render();
    } else {
      e.preventDefault();
    }
  });

  // Escape closes modal
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });

  // ---- Boot -----------------------------------------------------------------
  render();
})();
