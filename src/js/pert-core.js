(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PertCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const EPSILON = 1e-6;

  /** Standard normal CDF (Abramowitz & Stegun approximation). */
  function normalCdf(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }

  function parsePredecessors(text) {
    return String(text || '')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  }

  /** Returns an error message, or null when the input is valid. */
  function validate(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return 'Add at least one activity.';
    }
    const ids = new Set();
    for (const r of rows) {
      if (!r.id) {
        return 'Every activity needs an ID.';
      }
      if (ids.has(r.id)) {
        return 'Duplicate or empty activity ID: ' + r.id;
      }
      ids.add(r.id);
      const { o, m, p } = r;
      if (![o, m, p].every((x) => Number.isFinite(Number(x)) && Number(x) >= 0)) {
        return 'Activity ' + r.id + ': O, M and P must be non-negative numbers.';
      }
      if (!(Number(o) <= Number(m) && Number(m) <= Number(p))) {
        return 'Activity ' + r.id + ': times must satisfy O <= M <= P.';
      }
    }
    for (const r of rows) {
      for (const pre of parsePredecessors(r.pre)) {
        if (!ids.has(pre)) {
          return 'Activity ' + r.id + ': unknown predecessor "' + pre + '"';
        }
      }
    }
    return null;
  }

  /**
   * Runs the PERT forward/backward pass.
   * @param {Array} rows  [{id, name, pre, o, m, p}]
   * @param {number} target  deadline in weeks
   * @returns {{error:string}|object}
   */
  function compute(rows, target) {
    const error = validate(rows);
    if (error) {
      return { error };
    }

    const acts = rows.map((r) => {
      const o = Number(r.o);
      const m = Number(r.m);
      const p = Number(r.p);
      return {
        id: r.id,
        name: r.name,
        preds: parsePredecessors(r.pre),
        o, m, p,
        te: (o + 4 * m + p) / 6,
        v: ((p - o) / 6) ** 2,
      };
    });
    const byId = new Map(acts.map((a) => [a.id, a]));

    const order = [];
    const done = new Set();
    let progressed = true;
    while (order.length < acts.length && progressed) {
      progressed = false;
      for (const a of acts) {
        if (!done.has(a.id) && a.preds.every((p) => done.has(p))) {
          order.push(a);
          done.add(a.id);
          progressed = true;
        }
      }
    }
    if (order.length < acts.length) {
      return { error: 'Circular dependency detected. Check predecessors.' };
    }

    for (const a of order) {
      a.es = Math.max(0, ...a.preds.map((p) => byId.get(p).ef));
      a.ef = a.es + a.te;
      a.depth = a.preds.length ? Math.max(...a.preds.map((p) => byId.get(p).depth)) + 1 : 0;
    }
    const duration = Math.max(...order.map((a) => a.ef));

    for (const a of acts) {
      a.succ = acts.filter((s) => s.preds.includes(a.id));
    }
    for (const a of [...order].reverse()) {
      a.lf = a.succ.length ? Math.min(...a.succ.map((s) => s.ls)) : duration;
      a.ls = a.lf - a.te;
      a.slack = a.ls - a.es;
      a.critical = Math.abs(a.slack) < EPSILON;
    }

    const critical = order.filter((a) => a.critical);
    const variance = critical.reduce((sum, a) => sum + a.v, 0);
    const sigma = Math.sqrt(variance);
    const deadline = Number(target) || 0;
    let z;
    if (sigma > 0) {
      z = (deadline - duration) / sigma;
    } else {
      z = deadline >= duration ? Infinity : -Infinity;
    }

    return {
      activities: acts.map(({ succ, ...rest }) => rest),
      duration,
      variance,
      sigma,
      criticalPath: critical.map((a) => a.id),
      z,
      probability: normalCdf(z),
    };
  }

  return { compute, validate, parsePredecessors, normalCdf };
});
