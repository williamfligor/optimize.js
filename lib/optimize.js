var vector = require('./vector');
var sylvester = require('sylvester');

var $V = sylvester.Vector.create;
var $M = sylvester.Matrix.create;

var optimize = module.exports = {};

function q(x) {
    // The existential operator;
    return typeof(x) !== "undefined" && x !== null;
}

function approx_jacobian(x, f, ep) {
    // Approximate NxM dimensional gradient of the vector function
    // f using forward finite difference.
    var f0 = f(x);
    var grad = [];
    var eps = [];

    x = vector.atLeast1d(x);
    var x0 = vector.copy(x);

    if (typeof(ep.length) === "undefined") {
        for (var i = 0; i < x.length; i++){
            eps.push(ep);
        }
    } else if (ep.length === x.length) {
        eps = ep;
    } else {
        throw "Size mismatch in _approx_fprime.";
    }

    for (var k = 0; k < x.length; k++) {
        x[k] = x0[k] + eps[k];
        grad[k] = $V(f(x)).subtract(f0).x(1.0 / eps[k]).elements;
        x[k] = x0[k];
    }

    return $M(grad).transpose();
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

optimize.newton = function (fn, x0, opts) {
    // fn should return the chi vector (data - model) / sigma.
    // Also, this function uses _dumb-ass_ inversion. We suck.
    x0 = vector.atLeast1d(x0);
    var chi0 = fn(x0);
    var chi20 = vector.dot(chi0, chi0);

    // Defaults.
    if (!q(opts)){ opts = {}; }

    var ftol = q(opts.ftol) ? opts.ftol : 1e-10;
    var ep = q(opts.ep) ? opts.ep : 1.49e-8;  // Magic number from scipy.
    var maxiter = q(opts.maxiter) ? opts.maxiter : 200 * x0.length;

    // Not used
    //var fprime = q(opts.fprime) ? opts.fprime : function (x) {
    //    return optimize._approx_fprime(x, fn, ep);
    //};

    var alpha = 1.0;

    for (var i = 0; i < maxiter; i++) {
        var J = approx_jacobian(x0, fn, ep);
        var JT = J.transpose();
        var JTJ = JT.x(J);

        // not used
        //var diagJTJ = sylvester.Matrix.Diagonal(JTJ.diagonal().elements);

        var JTfx = JT.x($V(chi0));

        var dx = JTJ.inv().x(JTfx);
        // dx = JTJ.add(diagJTJ.x(lambda)).inv().x(JTfx);

        var x_best = vector.copy(x0);
        var chi_best = vector.copy(chi0);
        var chi2_best = chi20;

        for (var n = 0; n <= 5; n++) {
            alpha = Math.pow(2, -n);

            var x_try = vector.subtract(x0, dx.x(alpha).elements);
            var chi_try = fn(x_try);
            var chi2_try = vector.dot(chi_try, chi_try);

            if (chi2_try < chi2_best) {
                x_best = x_try;
                chi_best = chi_try;
                chi2_best = chi2_try;
            }
        }

        var dchi2 = chi20 - chi2_best;

        x0 = x_best;
        chi0 = chi_best;
        chi20 = chi2_best;

        if (dchi2 < 0.0){
            throw "Failure";
        }

        if (i > 1 && dchi2 < ftol){
            break;
        }
    }

    return x0;
};
