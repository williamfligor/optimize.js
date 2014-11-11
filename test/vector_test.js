'use strict';

var vector = require('../lib/vector');
var assert = require('should');

var chai = require('chai');
var expect = chai.expect;

describe('vector', function () {
    it('arg sort return self', function () {
        vector.argsort((1)).should.equal(1);
    });

    describe('coverage', function(){
        it('dot', function(){
            var fn = function(){
                vector.dot([1], [1,1]);
            };

            expect(fn).to.throw('Size mismatch in vector.dot.');
        });

        it('add', function(){
            var fn = function(){
                vector.add([1], [1,1]);
            };

            expect(fn).to.throw('Size mismatch in vector.add.');
        });

        it('subtract', function(){
            var fn = function(){
                vector.subtract([1], [1,1]);
            };

            expect(fn).to.throw('Size mismatch in vector.subtract.');
        });

        it('copy', function(){
            vector.copy(1).should.equal(1);
        });
    });

    it('shape', function(){
        vector.shape([[1, 2], [1, 2]]).should.eql([2, 2]);
    })

});

