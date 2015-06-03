var coordinatedbolt = require('../../lib/coordination/coordinatedbolt')
var es = require('event-stream')
var sinon = require('sinon')
var q = require('q')

describe('coordinatedbolt', function() {

	beforeEach(function() {
		this.sandbox = sinon.sandbox.create()
		this.context = {}
		this.context.downstreamTasks = this.sandbox.stub()
		this.context.upstreamTasks = this.sandbox.stub()
		this.context.upstreamTasks.returns([1,2])
		this.context.downstreamTasks.returns([3,4])
	})

	afterEach(function() {
		this.sandbox.restore()
	})

	describe('process callback', function() {

		beforeEach(function() {
			this.process = this.sandbox.spy()
			this.finish = this.sandbox.spy()
			this.bolt = coordinatedbolt(this.process, this.finish)
			this.ack = this.sandbox.spy(this.bolt.collector, 'ack')
			this.bolt.emit('prepare', this.context)
		})

		describe('receives a book-keeping tuple', function() {

			beforeEach(function() {
				this.tuple = { tuple: [1, 2], stream: coordinatedbolt.coordinatedStreamId }
				this.bolt.emit('tuple', this.tuple)
			})

			it('does not delegate processing of the tuple', function() {
				this.process.called.should.be.false
			})

			it('acks the tuple', function() {
				this.ack.calledWith(this.tuple).should.be.true
			})

			it('does not call the finish callback', function() {
				this.finish.called.should.be.false
			})

		})

		describe('receives a data tuple', function() {

			beforeEach(function() {
				this.tuple = { tuple: [1, 2] }
				this.bolt.emit('tuple', this.tuple)
			})

			it('delegates processing of the tuple', function() {
				this.process.calledWith(this.tuple).should.be.true
			})

			it('does not ack the tuple', function() {
				this.ack.called.should.be.false
			})

			it('does not call the finish callback', function() {
				this.finish.called.should.be.false
			})

		})

	})

	describe('finish callback', function() {

		beforeEach(function() {
			this.finishTuples = function(bolt, done) {
				// Expect 3 tuples, from 2 different upstream tasks
				bolt.emit('tuple', { tuple: [1, 1], stream: coordinatedbolt.coordinatedStreamId })
				bolt.emit('tuple', { tuple: [1] })
				bolt.emit('tuple', { tuple: [1] })
				bolt.emit('tuple', { tuple: [1, 2], stream: coordinatedbolt.coordinatedStreamId })
				bolt.emit('tuple', { tuple: [1] })
				bolt.on('requestfinished', function() {
					done()
				})
			}
		})

		describe('does not emit or return a promise', function() {

			beforeEach(function(done) {
				this.finish = this.sandbox.spy()
				this.bolt = coordinatedbolt(function(data) {
					this.ack(data)
				}, this.finish)
				this.emit = this.sandbox.spy(this.bolt.collector, 'emit')
				this.bolt.emit('prepare', this.context)
				this.finishTuples(this.bolt, done)
			})

			it('calls the finish callback', function() {
				this.finish.calledOnce.should.be.true
			})

			it('calls the finish callback with the request id', function() {
				this.finish.calledWith(1).should.be.true
			})

			it('emits book-keeping tuples to downstream tasks', function() {
				this.emit.calledWith([1,0], {stream: coordinatedbolt.coordinatedStreamId, task: 3}).should.be.true
				this.emit.calledWith([1,0], {stream: coordinatedbolt.coordinatedStreamId, task: 4}).should.be.true
			})

		})

		describe('emits', function() {

			beforeEach(function(done) {
				this.bolt = coordinatedbolt(function(data) {
					this.ack(data)
				}, function(requestId) {
					this.emit([requestId, 'test'])
				})
				this.emit = this.sandbox.stub(this.bolt.collector, 'emit', function() {
					return q.delay(1).then(function() {
						return [3] //Simulate delayed task return
					})
				})
				this.bolt.emit('prepare', this.context)
				this.finishTuples(this.bolt, done)
			})

			it('emits from the finish callback', function() {
				this.emit.calledWith([1, 'test']).should.be.true
			})

			it('emits book-keeping tuples to downstream tasks', function() {
				this.emit.calledWith([1,1], {stream: coordinatedbolt.coordinatedStreamId, task: 3}).should.be.true
				this.emit.calledWith([1,0], {stream: coordinatedbolt.coordinatedStreamId, task: 4}).should.be.true
			})

		})

		describe('returns a promise', function() {

			beforeEach(function(done) {
				this.bolt = coordinatedbolt(function(data) {
					this.emit([data.tuple[0]]) // Re-emit
					this.ack(data)
				}, function(requestId) {
					var collector = this
					return q.delay(1).finally(function() {
						collector.emit([requestId, 'test'])
					})
				})
				this.emit = this.sandbox.stub(this.bolt.collector, 'emit', function() {
					return q([4]) //Simulate task return
				})
				this.bolt.emit('prepare', this.context)
				this.finishTuples(this.bolt, done)
			})

			it('emits from the promise callback', function() {
				this.emit.calledWith([1, 'test']).should.be.true
			})

			it('emits book-keeping tuples to downstream tasks', function() {
				this.emit.calledWith([1,0], {stream: coordinatedbolt.coordinatedStreamId, task: 3}).should.be.true
				this.emit.calledWith([1,4], {stream: coordinatedbolt.coordinatedStreamId, task: 4}).should.be.true
			})

		})

	})

})
