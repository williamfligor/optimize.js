'use strict';

var optimize = require('../');
var assert = require('should');

describe('neldermead', function () {
    it('single independent var', function () {
        var ans = optimize.fmin(function(x){
            return 3 * Math.pow(x - 2, 2);
        }, 0);

        ans.x.should.eql([ 1.9997500000000024 ]);
    });

    it('multiple independent var', function () {
        var ans = optimize.fmin(function(x){
            return Math.pow(x[0] * x[1] - 10, 2);
        }, [0.5, 0.5], {
            ftol: 1e-11,
            ep: 1.5e-9,
            maxiter: 500
        });

        ans.x.should.eql([ 3.1607583999633713, 3.163797950744621 ] );
    });
});

describe('newton', function () {
    it('single independent var', function () {
        var ans = optimize.newton(function(x){
            return [3 * Math.pow(x - 2, 2),3 * Math.pow(x - 2, 2)];
        }, 0, {
            ftol: 1e-11,
            ep: 1.5e-9,
            maxiter: 500
        });

        if(Math.abs(1.9995117262371358 - ans) > 0.1){
            throw 'not close enough';
        }
    });
});
