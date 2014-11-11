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
