/* store.js — data layer backed by localStorage.
 * All student data stays in this browser. Nothing is sent anywhere.
 */
(function () {
  "use strict";

  var KEY = "sheena_sped_tracker_v1";
  var SCHEMA_VERSION = 1;

  // ---- Reference data -------------------------------------------------------
  var DISABILITY_CATEGORIES = [
    "Autism", "Specific Learning Disability", "Other Health Impairment (ADHD)",
    "Intellectual Disability", "Emotional Disturbance", "Speech/Language Impairment",
    "Multiple Disabilities", "Developmental Delay", "Hearing Impairment",
    "Visual Impairment", "Orthopedic Impairment", "Traumatic Brain Injury", "Deaf-Blindness"
  ];

  var GOAL_AREAS = [
    "Reading", "Writing", "Math", "Communication/Language",
    "Behavior/Social-Emotional", "Adaptive/Daily Living", "Motor Skills",
    "Study/Organization Skills", "Transition/Vocational"
  ];

  // Measurement types drive how a data point is scored & charted.
  var MEASUREMENT_TYPES = {
    percent: { label: "Percent correct (trials)", unit: "%", hasTotal: true, max: 100 },
    frequency: { label: "Frequency (count)", unit: "", hasTotal: false, max: null },
    duration: { label: "Duration (minutes)", unit: "min", hasTotal: false, max: null },
    prompt: { label: "Prompt level (independence)", unit: "", hasTotal: false, max: 5, prompt: true },
    rating: { label: "Rating scale (0–5)", unit: "/5", hasTotal: false, max: 5 }
  };

  // Prompt hierarchy: higher number = more independent (the goal).
  var PROMPT_LEVELS = [
    { value: 5, label: "Independent" },
    { value: 4, label: "Verbal prompt" },
    { value: 3, label: "Gestural prompt" },
    { value: 2, label: "Model prompt" },
    { value: 1, label: "Partial physical" },
    { value: 0, label: "Full physical" }
  ];

  var ACCOMMODATION_CATEGORIES = ["Presentation", "Response", "Setting", "Timing/Scheduling", "Behavioral", "Assistive Technology"];

  var BEHAVIOR_INTENSITY = ["Low", "Medium", "High"];

  // ---- Persistence ----------------------------------------------------------
  function emptyData() {
    return { schemaVersion: SCHEMA_VERSION, students: [], progress: [], behaviors: [], settings: { customMeasures: [] } };
  }

  var _cache = null;

  function load() {
    if (!_cache) {
      try {
        var raw = localStorage.getItem(KEY);
        _cache = raw ? JSON.parse(raw) : emptyData();
      } catch (e) {
        console.error("Could not read saved data:", e);
        _cache = emptyData();
      }
    }
    // Normalize on every load so any code path (import, sample) stays valid.
    if (!_cache.students) _cache.students = [];
    if (!_cache.progress) _cache.progress = [];
    if (!_cache.behaviors) _cache.behaviors = [];
    if (!_cache.settings) _cache.settings = { customMeasures: [] };
    if (!_cache.settings.customMeasures) _cache.settings.customMeasures = [];
    // Backfill objectives array on older goals.
    _cache.students.forEach(function (s) {
      (s.goals || []).forEach(function (g) { if (!g.objectives) g.objectives = []; });
    });
    return _cache;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(_cache));
      return true;
    } catch (e) {
      console.error("Could not save data:", e);
      alert("Warning: could not save data. Your browser storage may be full or blocked (e.g. private browsing). Export a backup to be safe.");
      return false;
    }
  }

  // Simple unique id without Date.now()/random dependency concerns.
  var _counter = 0;
  function uid() {
    _counter += 1;
    var t = (new Date()).getTime();
    return "id" + t.toString(36) + "-" + _counter.toString(36);
  }

  // ---- Students -------------------------------------------------------------
  function getStudents() { return load().students.slice(); }
  function getStudent(id) { return load().students.filter(function (s) { return s.id === id; })[0] || null; }

  function addStudent(fields) {
    var s = {
      id: uid(),
      firstName: fields.firstName || "",
      lastName: fields.lastName || "",
      grade: fields.grade || "",
      disability: fields.disability || "",
      caseManager: fields.caseManager || "",
      dates: {
        annualReview: fields.annualReview || "",
        reevaluation: fields.reevaluation || ""
      },
      goals: [],
      accommodations: [],
      createdAt: (new Date()).toISOString()
    };
    load().students.push(s);
    save();
    return s;
  }

  function updateStudent(id, fields) {
    var s = getStudent(id);
    if (!s) return null;
    ["firstName", "lastName", "grade", "disability", "caseManager"].forEach(function (k) {
      if (fields[k] !== undefined) s[k] = fields[k];
    });
    if (fields.annualReview !== undefined) s.dates.annualReview = fields.annualReview;
    if (fields.reevaluation !== undefined) s.dates.reevaluation = fields.reevaluation;
    save();
    return s;
  }

  function deleteStudent(id) {
    var d = load();
    d.students = d.students.filter(function (s) { return s.id !== id; });
    d.progress = d.progress.filter(function (p) { return p.studentId !== id; });
    d.behaviors = d.behaviors.filter(function (b) { return b.studentId !== id; });
    save();
  }

  // ---- Goals (nested under student) ----------------------------------------
  function addGoal(studentId, fields) {
    var s = getStudent(studentId);
    if (!s) return null;
    var g = {
      id: uid(),
      area: fields.area || "",
      description: fields.description || "",
      baseline: fields.baseline || "",
      measurement: fields.measurement || "percent",
      target: fields.target === "" || fields.target == null ? null : Number(fields.target),
      status: fields.status || "active",
      objectives: [],
      createdAt: (new Date()).toISOString()
    };
    s.goals.push(g);
    save();
    return g;
  }

  function updateGoal(studentId, goalId, fields) {
    var s = getStudent(studentId);
    if (!s) return null;
    var g = s.goals.filter(function (x) { return x.id === goalId; })[0];
    if (!g) return null;
    ["area", "description", "baseline", "measurement", "status"].forEach(function (k) {
      if (fields[k] !== undefined) g[k] = fields[k];
    });
    if (fields.target !== undefined) g.target = fields.target === "" || fields.target == null ? null : Number(fields.target);
    save();
    return g;
  }

  function deleteGoal(studentId, goalId) {
    var s = getStudent(studentId);
    if (!s) return;
    s.goals = s.goals.filter(function (g) { return g.id !== goalId; });
    load().progress = load().progress.filter(function (p) { return p.goalId !== goalId; });
    save();
  }

  function getGoal(studentId, goalId) {
    var s = getStudent(studentId);
    if (!s) return null;
    return s.goals.filter(function (g) { return g.id === goalId; })[0] || null;
  }

  function allGoals() {
    var out = [];
    load().students.forEach(function (s) {
      s.goals.forEach(function (g) { out.push({ student: s, goal: g }); });
    });
    return out;
  }

  // ---- Objectives / benchmarks (nested under a goal) ------------------------
  function addObjective(studentId, goalId, text) {
    var g = getGoal(studentId, goalId);
    if (!g) return null;
    if (!g.objectives) g.objectives = [];
    var o = { id: uid(), text: text || "", status: "active" };
    g.objectives.push(o);
    save();
    return o;
  }
  function toggleObjective(studentId, goalId, objId) {
    var g = getGoal(studentId, goalId);
    if (!g || !g.objectives) return;
    var o = g.objectives.filter(function (x) { return x.id === objId; })[0];
    if (!o) return;
    o.status = o.status === "met" ? "active" : "met";
    save();
  }
  function deleteObjective(studentId, goalId, objId) {
    var g = getGoal(studentId, goalId);
    if (!g || !g.objectives) return;
    g.objectives = g.objectives.filter(function (x) { return x.id !== objId; });
    save();
  }

  // ---- Measurement types (built-in + user-defined) --------------------------
  function measures() {
    var out = {};
    Object.keys(MEASUREMENT_TYPES).forEach(function (k) { out[k] = MEASUREMENT_TYPES[k]; });
    load().settings.customMeasures.forEach(function (m) {
      out[m.key] = { label: m.label, unit: m.unit || "", hasTotal: false, max: m.max != null ? m.max : null, custom: true };
    });
    return out;
  }
  function measure(key) { return measures()[key] || MEASUREMENT_TYPES.percent; }
  function customMeasures() { return load().settings.customMeasures.slice(); }
  function addCustomMeasure(fields) {
    function slug(t) { return String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) || "measure"; }
    var existing = measures();
    var base = "c_" + slug(fields.label), key = base, i = 1;
    while (existing[key]) { key = base + "_" + i; i++; }
    var m = {
      key: key,
      label: fields.label || "Custom measure",
      unit: fields.unit || "",
      max: fields.max === "" || fields.max == null ? null : Number(fields.max)
    };
    load().settings.customMeasures.push(m);
    save();
    return m;
  }
  function deleteCustomMeasure(key) {
    load().settings.customMeasures = load().settings.customMeasures.filter(function (m) { return m.key !== key; });
    save();
  }

  // ---- Progress summary (auto-generated narrative) --------------------------
  function regressionSlope(vals) {
    var n = vals.length;
    if (n < 2) return 0;
    var sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (var i = 0; i < n; i++) { sx += i; sy += vals[i]; sxy += i * vals[i]; sxx += i * i; }
    var d = n * sxx - sx * sx;
    if (d === 0) return 0;
    return (n * sxy - sx * sy) / d;
  }
  function fmtShort(iso) {
    var p = (iso || "").split("-");
    return p.length < 3 ? iso : (parseInt(p[1], 10) + "/" + parseInt(p[2], 10) + "/" + p[0].slice(2));
  }
  // Reads a goal's data points and returns { status, label, text, met, pct, latest }.
  function summarize(goal, points, name) {
    var m = measure(goal.measurement), unit = m.unit || "";
    var who = name || "Performance";
    if (!points || !points.length) return { status: "none", label: "No data", text: "No data collected yet." };
    var vals = points.map(function (p) { return valueOf(p, goal); }).filter(function (v) { return v != null && !isNaN(v); });
    if (!vals.length) return { status: "none", label: "No data", text: "No numeric data recorded yet." };

    function fmtVal(v) {
      if (goal.measurement === "prompt") {
        var pl = PROMPT_LEVELS.filter(function (p) { return p.value === v; })[0];
        return pl ? pl.label : String(v);
      }
      return v + unit;
    }

    var first = vals[0], last = vals[vals.length - 1];
    var change = Math.round((last - first) * 10) / 10;
    var slope = regressionSlope(vals);
    var higherBetter = goal.target != null ? goal.target >= first : slope >= 0;
    var dirWord = slope > 0.01 ? (higherBetter ? "improving" : "increasing")
      : slope < -0.01 ? (higherBetter ? "declining" : "decreasing")
        : "holding steady";

    var met = false, pct = null;
    if (goal.target != null) {
      met = higherBetter ? last >= goal.target : last <= goal.target;
      var denom = goal.target - first;
      pct = denom === 0 ? (met ? 100 : 0) : Math.max(0, Math.min(100, Math.round(((last - first) / denom) * 100)));
    }

    var status = met ? "met"
      : (slope > 0.01 && higherBetter) ? "improving"
        : (slope < -0.01 && higherBetter) ? "declining"
          : "flat";
    var label = met ? "Target met" : status === "improving" ? "On track" : status === "declining" ? "Declining" : "Monitor";

    var range = points.length > 1 ? " (" + fmtShort(points[0].date) + "–" + fmtShort(points[points.length - 1].date) + ")" : "";
    var changeStr = goal.measurement === "prompt"
      ? (Math.abs(change) + " level" + (Math.abs(change) === 1 ? "" : "s") + (change >= 0 ? " more independent" : " less independent"))
      : ((change >= 0 ? "+" : "") + change + unit);
    var text = "Across " + points.length + " session" + (points.length === 1 ? "" : "s") + range + ", " +
      who + " went from " + fmtVal(first) + " to " + fmtVal(last) +
      (vals.length > 1 ? " (" + changeStr + ")" : "") + ". Trend is " + dirWord + ". ";
    if (goal.target != null) {
      if (met) text += "The target of " + fmtVal(goal.target) + " has been met. 🎯";
      else if (pct != null && pct > 0) text += "About " + pct + "% of the way from baseline to the " + fmtVal(goal.target) + " target.";
      else text += "Not yet progressing toward the " + fmtVal(goal.target) + " target.";
    }
    return { status: status, label: label, text: text, met: met, pct: pct, latest: last, change: change };
  }

  // ---- Accommodations -------------------------------------------------------
  function addAccommodation(studentId, fields) {
    var s = getStudent(studentId);
    if (!s) return null;
    var a = { id: uid(), category: fields.category || "Presentation", text: fields.text || "" };
    s.accommodations.push(a);
    save();
    return a;
  }
  function deleteAccommodation(studentId, accId) {
    var s = getStudent(studentId);
    if (!s) return;
    s.accommodations = s.accommodations.filter(function (a) { return a.id !== accId; });
    save();
  }

  // ---- Progress data points -------------------------------------------------
  function addProgress(fields) {
    var p = {
      id: uid(),
      studentId: fields.studentId,
      goalId: fields.goalId,
      date: fields.date,
      score: fields.score === "" || fields.score == null ? null : Number(fields.score),
      total: fields.total === "" || fields.total == null ? null : Number(fields.total),
      notes: fields.notes || ""
    };
    load().progress.push(p);
    save();
    return p;
  }

  function deleteProgress(id) {
    load().progress = load().progress.filter(function (p) { return p.id !== id; });
    save();
  }

  function progressForGoal(goalId) {
    return load().progress
      .filter(function (p) { return p.goalId === goalId; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }

  // Convert a data point into a single numeric "value" for charting/summary,
  // based on the goal's measurement type.
  function valueOf(point, goal) {
    var m = goal ? goal.measurement : "percent";
    if (m === "percent") {
      if (point.total && point.total > 0 && point.score != null) {
        return Math.round((point.score / point.total) * 1000) / 10;
      }
      return point.score;
    }
    return point.score;
  }

  // ---- Behavior (ABC) -------------------------------------------------------
  function addBehavior(fields) {
    var b = {
      id: uid(),
      studentId: fields.studentId,
      date: fields.date,
      time: fields.time || "",
      setting: fields.setting || "",
      antecedent: fields.antecedent || "",
      behavior: fields.behavior || "",
      consequence: fields.consequence || "",
      intensity: fields.intensity || "",
      durationMin: fields.durationMin === "" || fields.durationMin == null ? null : Number(fields.durationMin),
      notes: fields.notes || ""
    };
    load().behaviors.push(b);
    save();
    return b;
  }
  function deleteBehavior(id) {
    load().behaviors = load().behaviors.filter(function (b) { return b.id !== id; });
    save();
  }
  function behaviorsForStudent(studentId) {
    return load().behaviors
      .filter(function (b) { return b.studentId === studentId; })
      .sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? 1 : -1; });
  }
  function allBehaviors() {
    return load().behaviors.slice().sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? 1 : -1; });
  }

  // ---- Import / export ------------------------------------------------------
  function exportJSON() { return JSON.stringify(load(), null, 2); }

  function importJSON(text, mode) {
    var incoming = JSON.parse(text);
    if (!incoming || !Array.isArray(incoming.students)) {
      throw new Error("This file does not look like a Goal Tracker backup.");
    }
    if (mode === "replace") {
      _cache = {
        schemaVersion: SCHEMA_VERSION,
        students: incoming.students || [],
        progress: incoming.progress || [],
        behaviors: incoming.behaviors || [],
        settings: incoming.settings && incoming.settings.customMeasures ? incoming.settings : { customMeasures: [] }
      };
    } else {
      // merge: append, giving imported records fresh ids to avoid collisions.
      var d = load();
      var idMap = {};
      (incoming.students || []).forEach(function (s) {
        var oldId = s.id;
        s.id = uid();
        idMap[oldId] = s.id;
        (s.goals || []).forEach(function (g) {
          var oldG = g.id; g.id = uid(); idMap[oldG] = g.id;
        });
        (s.accommodations || []).forEach(function (a) { a.id = uid(); });
        d.students.push(s);
      });
      (incoming.progress || []).forEach(function (p) {
        p.id = uid();
        p.studentId = idMap[p.studentId] || p.studentId;
        p.goalId = idMap[p.goalId] || p.goalId;
        d.progress.push(p);
      });
      (incoming.behaviors || []).forEach(function (b) {
        b.id = uid();
        b.studentId = idMap[b.studentId] || b.studentId;
        d.behaviors.push(b);
      });
      // Merge any custom measurement types not already present.
      if (incoming.settings && incoming.settings.customMeasures) {
        var haveKeys = {};
        d.settings.customMeasures.forEach(function (m) { haveKeys[m.key] = true; });
        incoming.settings.customMeasures.forEach(function (m) {
          if (!haveKeys[m.key]) d.settings.customMeasures.push(m);
        });
      }
    }
    save();
  }

  function clearAll() {
    _cache = emptyData();
    save();
  }

  function loadSampleData() {
    _cache = sampleData();
    save();
  }

  function isEmpty() { return load().students.length === 0; }

  // ---- Sample data ----------------------------------------------------------
  function sampleData() {
    function iso(y, m, d) {
      return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    }
    var s1 = {
      id: "stu-ava", firstName: "Ava", lastName: "Nguyen", grade: "3", disability: "Specific Learning Disability",
      caseManager: "Ms. Richardson", dates: { annualReview: iso(2026, 9, 14), reevaluation: iso(2027, 4, 2) },
      accommodations: [
        { id: "a1", category: "Presentation", text: "Text read aloud for assessments over one paragraph" },
        { id: "a2", category: "Timing/Scheduling", text: "Extended time (1.5x) on tests" },
        { id: "a3", category: "Setting", text: "Small-group setting for state testing" }
      ],
      goals: [
        { id: "g-ava-read", area: "Reading", description: "Given a 3rd-grade passage, Ava will read aloud with 90% accuracy across 3 consecutive sessions.", baseline: "62% accuracy", measurement: "percent", target: 90, status: "active", createdAt: "2026-01-10", objectives: [
          { id: "o-ava-1", text: "Read 2nd-grade passages with 90% accuracy", status: "met" },
          { id: "o-ava-2", text: "Read 3rd-grade passages with 80% accuracy", status: "active" }
        ] },
        { id: "g-ava-math", area: "Math", description: "Ava will solve single-digit multiplication facts with 80% accuracy.", baseline: "40%", measurement: "percent", target: 80, status: "active", createdAt: "2026-01-10", objectives: [] }
      ],
      createdAt: "2026-01-10"
    };
    var s2 = {
      id: "stu-marcus", firstName: "Marcus", lastName: "Bell", grade: "5", disability: "Other Health Impairment (ADHD)",
      caseManager: "Ms. Richardson", dates: { annualReview: iso(2026, 8, 3), reevaluation: iso(2028, 1, 20) },
      accommodations: [
        { id: "b1", category: "Behavioral", text: "Movement breaks every 20 minutes" },
        { id: "b2", category: "Presentation", text: "Chunked assignments (one part at a time)" }
      ],
      goals: [
        { id: "g-marcus-beh", area: "Behavior/Social-Emotional", description: "Marcus will remain on-task during independent work for 10 minutes with no more than 1 redirection.", baseline: "3 min", measurement: "duration", target: 10, status: "active", createdAt: "2026-01-15" },
        { id: "g-marcus-write", area: "Writing", description: "Marcus will independently begin a writing task within 2 minutes of the prompt (prompt-level goal).", baseline: "Full physical", measurement: "prompt", target: 5, status: "active", createdAt: "2026-01-15" }
      ],
      createdAt: "2026-01-15"
    };
    var s3 = {
      id: "stu-lily", firstName: "Lily", lastName: "Ortiz", grade: "K", disability: "Speech/Language Impairment",
      caseManager: "Ms. Richardson", dates: { annualReview: iso(2026, 7, 30), reevaluation: iso(2027, 11, 5) },
      accommodations: [
        { id: "c1", category: "Response", text: "May respond using picture/AAC choices" }
      ],
      goals: [
        { id: "g-lily-comm", area: "Communication/Language", description: "Lily will use 2-word phrases to request during structured activities in 8 of 10 opportunities.", baseline: "1-word, 30%", measurement: "percent", target: 80, status: "active", createdAt: "2026-02-01" }
      ],
      createdAt: "2026-02-01"
    };

    var progress = [];
    function addP(studentId, goalId, date, score, total) {
      progress.push({ id: "p" + progress.length, studentId: studentId, goalId: goalId, date: date, score: score, total: total, notes: "" });
    }
    // Ava reading — improving trend
    addP("stu-ava", "g-ava-read", iso(2026, 5, 4), 13, 20);
    addP("stu-ava", "g-ava-read", iso(2026, 5, 11), 14, 20);
    addP("stu-ava", "g-ava-read", iso(2026, 5, 18), 15, 20);
    addP("stu-ava", "g-ava-read", iso(2026, 5, 26), 16, 20);
    addP("stu-ava", "g-ava-read", iso(2026, 6, 2), 17, 20);
    addP("stu-ava", "g-ava-read", iso(2026, 6, 9), 17, 20);
    addP("stu-ava", "g-ava-read", iso(2026, 6, 16), 18, 20);
    // Ava math
    addP("stu-ava", "g-ava-math", iso(2026, 5, 6), 8, 20);
    addP("stu-ava", "g-ava-math", iso(2026, 5, 13), 10, 20);
    addP("stu-ava", "g-ava-math", iso(2026, 5, 20), 11, 20);
    addP("stu-ava", "g-ava-math", iso(2026, 6, 3), 13, 20);
    addP("stu-ava", "g-ava-math", iso(2026, 6, 17), 14, 20);
    // Marcus duration
    addP("stu-marcus", "g-marcus-beh", iso(2026, 5, 5), 3, null);
    addP("stu-marcus", "g-marcus-beh", iso(2026, 5, 12), 4, null);
    addP("stu-marcus", "g-marcus-beh", iso(2026, 5, 19), 4, null);
    addP("stu-marcus", "g-marcus-beh", iso(2026, 6, 2), 6, null);
    addP("stu-marcus", "g-marcus-beh", iso(2026, 6, 16), 7, null);
    // Marcus prompt level
    addP("stu-marcus", "g-marcus-write", iso(2026, 5, 8), 1, null);
    addP("stu-marcus", "g-marcus-write", iso(2026, 5, 15), 2, null);
    addP("stu-marcus", "g-marcus-write", iso(2026, 5, 22), 2, null);
    addP("stu-marcus", "g-marcus-write", iso(2026, 6, 5), 3, null);
    addP("stu-marcus", "g-marcus-write", iso(2026, 6, 19), 4, null);
    // Lily comm
    addP("stu-lily", "g-lily-comm", iso(2026, 5, 7), 4, 10);
    addP("stu-lily", "g-lily-comm", iso(2026, 5, 14), 5, 10);
    addP("stu-lily", "g-lily-comm", iso(2026, 5, 21), 5, 10);
    addP("stu-lily", "g-lily-comm", iso(2026, 6, 4), 6, 10);
    addP("stu-lily", "g-lily-comm", iso(2026, 6, 18), 7, 10);

    var behaviors = [
      { id: "bh1", studentId: "stu-marcus", date: iso(2026, 6, 17), time: "10:15", setting: "Math — independent work", antecedent: "Given multi-step worksheet", behavior: "Left seat, wandered room", consequence: "Redirected, given chunked task", intensity: "Medium", durationMin: 4, notes: "Calmer once task was broken down." },
      { id: "bh2", studentId: "stu-marcus", date: iso(2026, 6, 16), time: "13:40", setting: "Reading circle", antecedent: "Asked to read aloud", behavior: "Refusal, put head down", consequence: "Offered choice of passage", intensity: "Low", durationMin: 2, notes: "" },
      { id: "bh3", studentId: "stu-ava", date: iso(2026, 6, 15), time: "09:05", setting: "Morning arrival", antecedent: "Unstructured transition", behavior: "Difficulty starting work", consequence: "Visual checklist provided", intensity: "Low", durationMin: 3, notes: "Checklist helped." }
    ];

    return { schemaVersion: SCHEMA_VERSION, students: [s1, s2, s3], progress: progress, behaviors: behaviors, settings: { customMeasures: [] } };
  }

  // ---- Public API -----------------------------------------------------------
  window.Store = {
    KEY: KEY,
    DISABILITY_CATEGORIES: DISABILITY_CATEGORIES,
    GOAL_AREAS: GOAL_AREAS,
    MEASUREMENT_TYPES: MEASUREMENT_TYPES,
    PROMPT_LEVELS: PROMPT_LEVELS,
    ACCOMMODATION_CATEGORIES: ACCOMMODATION_CATEGORIES,
    BEHAVIOR_INTENSITY: BEHAVIOR_INTENSITY,
    getStudents: getStudents, getStudent: getStudent, addStudent: addStudent,
    updateStudent: updateStudent, deleteStudent: deleteStudent,
    addGoal: addGoal, updateGoal: updateGoal, deleteGoal: deleteGoal, getGoal: getGoal, allGoals: allGoals,
    addObjective: addObjective, toggleObjective: toggleObjective, deleteObjective: deleteObjective,
    measures: measures, measure: measure, customMeasures: customMeasures,
    addCustomMeasure: addCustomMeasure, deleteCustomMeasure: deleteCustomMeasure,
    summarize: summarize,
    addAccommodation: addAccommodation, deleteAccommodation: deleteAccommodation,
    addProgress: addProgress, deleteProgress: deleteProgress, progressForGoal: progressForGoal, valueOf: valueOf,
    addBehavior: addBehavior, deleteBehavior: deleteBehavior, behaviorsForStudent: behaviorsForStudent, allBehaviors: allBehaviors,
    exportJSON: exportJSON, importJSON: importJSON, clearAll: clearAll, loadSampleData: loadSampleData, isEmpty: isEmpty
  };
})();
