var prepare = require('../lib/prepare')
var es = require('event-stream')
var sinon = require('sinon')

describe('prepare', function() {

	it('removes the handshake from the stream', function(done) {
		es.readArray([2, {conf:1}, 3])
			.pipe(prepare())
			.pipe(es.writeArray(function(err, array) {
				(err == null).should.be.true
				array.should.eql([2, 3])
				done()
			}))
	})

	it('emits the prepare event before emitting any data', function(done) {
		var emitPrepare = sinon.spy()
		var emitData = sinon.spy()
		es.readArray([2, {conf:1}, 3])
			.pipe(prepare())
			.on('prepare', emitPrepare)
			.on('data', emitData)
			.pipe(es.wait(function() {
				emitPrepare.calledBefore(emitData).should.be.true
				done()
			}))
	})

	it('dequeues all events if the stream ends without a handshake', function(done) {
		es.readArray([1,2,3])
			.pipe(prepare())
			.pipe(es.writeArray(function(err, array) {
				(err == null).should.be.true
				array.should.eql([1, 2, 3])
				done()
			}))
	})

})
