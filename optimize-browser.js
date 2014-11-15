(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var vector = require('./vector');
var optimize = module.exports = {};

function q(x) {
    // The existential operator;
    return typeof(x) !== "undefined" && x !== null;
}

function max_abs_diff(x0, x) {
    var max = 0.0;

    for (var i = 0; i < x.length; i++){
        max = Math.max(max, Math.abs(x0 - x[i]));
    }
    return max;
}

optimize.fmin = function (func, x0, opts) {
    // Optimize a function using Nelder-Mead.

    x0 = vector.atLeast1d(x0);
    var N = x0.length;

    // Defaults.
    if (!q(opts)){ opts = {}; }

    // Not used
    //var xtol = q(opts.xtol) ? opts.xtol : 1e-6;

    var ftol = q(opts.ftol) ? opts.ftol : 1e-6;
    var maxiter = q(opts.maxiter) ? opts.maxiter : 200 * N;

    // Magic numbers from `scipy`.
    var rho = 1;
    var chi = 2;
    var psi = 0.5;
    var sigma = 0.5;
    var nonzdelt = 0.05;
    var zdelt = 0.00025;

    var sim = [];
    sim[0] = x0;
    var fsim = [];
    fsim[0] = func(x0);

    for (var i = 0; i < N; i++) {
        var y = vector.copy(x0);
        if (y[i] !== 0.0){
            y[i] *= (1 + nonzdelt);
        }else {
            y[i] = zdelt;
        }

        sim[i + 1] = y;
        fsim[i + 1] = func(y);
    }

    var inds = vector.argsort(fsim);
    fsim = vector.take(fsim, inds);
    sim = vector.take(sim, inds);

    var iterations = 0;

    // Constraint on function calls is needed.
    while (iterations < maxiter) {
        var doshrink = false;

        iterations += 1;
        // A break based on xtol needs to be included too.
        if (max_abs_diff(fsim[0], fsim.slice(1, fsim.length)) <= ftol){
            break;
        }

        var xbar = vector.fmult(1.0 / N,
            vector.reduce(sim.slice(0, sim.length - 1)));
        var xr = vector.add(vector.fmult(1 + rho, xbar),
            vector.fmult(-rho, sim[sim.length - 1]));
        var fxr = func(xr);

        if (fxr < fsim[0]) {
            var xe = vector.add(vector.fmult(1 + rho * chi, xbar),
                vector.fmult(-rho * chi, sim[sim.length - 1]));
            var fxe = func(xe);
            if (fxe < fxr) {
                sim[sim.length - 1] = xe;
                fsim[fsim.length - 1] = fxe;
            } else {
                sim[sim.length - 1] = xr;
                fsim[fsim.length - 1] = fxr;
            }
        } else {
            if (fxr < fsim[fsim.length - 2]) {
                sim[sim.length - 1] = xr;
                fsim[fsim.length - 1] = fxr;
            } else {
                var xc, fxc;
                if (fxr < fsim[fsim.length - 1]) {
                    xc = vector.add(vector.fmult(1 + rho * psi, xbar),
                        vector.fmult(-rho * psi, sim[sim.length - 1]));
                    fxc = func(xc);
                    if (fxc < fsim[fsim.length - 1]) {
                        sim[sim.length - 1] = xc;
                        fsim[fsim.length - 1] = fxc;
                    } else {
                        doshrink = true;
                    }
                } else {
                    xc = vector.add(vector.fmult(1 - psi, xbar),
                        vector.fmult(psi, sim[sim.length - 1]));
                    fxc = func(xc);
                    if (fxc < fsim[fsim.length - 1]) {
                        sim[sim.length - 1] = xc;
                        fsim[fsim.length - 1] = fxc;
                    } else {
                        doshrink = true;
                    }
                }

                if (doshrink) {
                    for (var j = 1; j < N + 1; j++) {
                        sim[j] = vector.add(sim[0], vector.fmult(sigma,
                            vector.subtract(sim[j], sim[0])));
                        fsim[j] = func(sim[j]);
                    }
                }
            }
        }

        inds = vector.argsort(fsim);
        fsim = vector.take(fsim, inds);
        sim = vector.take(sim, inds);
    }

    var x = sim[0];
    var fval = fsim[0];

    var result = {};

    if (iterations >= maxiter){
        result.error = "Too many iterations. " + iterations;
    }else{
        result.result = "Converged in " + iterations + " iterations.";
    }

    result.x = x;
    result.fval = fval;

    return result;
};

},{"./vector":2}],2:[function(require,module,exports){
var vector = module.exports = {};

function merge(l, r, data) {
    // Merging for use with a merge argsort.
    var result = [];
    while (l.length && r.length) {
        if (data[l[0]] <= data[r[0]]){
            result.push(l.shift());
        }else{
            result.push(r.shift());
        }
    }
    while (l.length){
        result.push(l.shift());
    }
    while (r.length){
        result.push(r.shift());
    }
    return result;
}

vector.shape = function(arr, ret){
    if(!ret){ ret = []; }

    if(Array.isArray(arr)){
        ret.push(arr.length);
        return vector.shape(arr[0], ret);
    }else{
        return ret;
    }
};

vector.copy = function (x) {
    var y, i;
    if (typeof(x.length) === "undefined"){
        return x;
    }

    y = [];
    for (i = 0; i < x.length; i++){
        y[i] = x[i];
    }

    return y;
};

vector.atLeast1d = function (x) {
    // Make sure that an object acts as an array (even if it's a scalar).
    if (typeof(x.length) === "undefined") {
        var tmp = [];
        tmp[0] = x;
        return tmp;
    }
    return x;
};

vector.range = function (a, b, c) {
    var xmin, xmax, dx, x, rng = [];
    if (typeof(b) === "undefined") {
        xmin = 0;
        xmax = a;
        dx = 1;
    } else if (typeof(c) === "undefined") {
        xmin = a;
        xmax = b;
        dx = 1;
    } else {
        xmin = a;
        xmax = b;
        dx = c;
    }

    var i;
    for (x = xmin, i = 0; x < xmax; x += dx, i++){
        rng[i] = x;
    }

    return rng;
};

vector.dot = function (a, b) {
    var i, result = 0.0;
    if (a.length !== b.length){
        throw "Size mismatch in vector.dot.";
    }

    for (i = 0; i < a.length; i++) {
        result += a[i] * b[i];
    }
    return result;
};

vector.fmult = function (f, v) {
    var i, result = [];
    for (i = 0; i < v.length; i++) {
        result[i] = f * v[i];
    }
    return result;
};

vector.add = function (a, b) {
    var i, result = [];
    if (a.length !== b.length) {
        throw "Size mismatch in vector.add.";
    }
    for (i = 0; i < a.length; i++) {
        result[i] = a[i] + b[i];
    }
    return result;
};

vector.subtract = function (a, b) {
    var i, result = [];
    if (a.length !== b.length) {
        throw "Size mismatch in vector.subtract.";
    }
    for (i = 0; i < a.length; i++) {
        result[i] = a[i] - b[i];
    }
    return result;
};

vector.reduce = function (x) {
    var i, result = x[0];
    for (i = 1; i < x.length; i++){
        result = vector.add(result, x[i]);
    }
    return result;
};

vector.take = function (x, ind) {
    // Re-order a vector.
    var i, result = [];
    for (i = 0; i < ind.length; i++) {
        result[i] = x[ind[i]];
    }
    return result;
};

function rec_argsort(inds, data) {
    // The recursive helper function for the argsort.
    var m, l, r;
    if (typeof(inds) === "undefined" || inds.length === 1) {
        return inds;
    }

    m = parseInt(inds.length / 2);
    l = inds.slice(0, m);
    r = inds.slice(m, inds.length);
    return merge(rec_argsort(l, data),
        rec_argsort(r, data), data);
}

vector.argsort = function (x) {
    // Argsort of an array using merge sort.
    if (typeof(x.length) === "undefined" || x.length === 1) {
        return x;
    }

    return rec_argsort(vector.range(x.length), x);
};

},{}]},{},[1]);
