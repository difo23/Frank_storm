var createTask = require('../lib/task')
var es = require('event-stream')
var sinon = require('sinon')

describe('task', function() {

	it('ends the collector when the stream ends', function(done) {
		var task = createTask()
		var end = sinon.spy(task.collector, 'end')
		es.readArray([])
			.pipe(task)
			.pipe(es.wait(function() {
				end.calledOnce.should.be.true
				done()
			}))
	})

	it('emits an event for each command', function(done) {
		var task = createTask()
		es.readArray([{command:'next'}])
			.pipe(task)
			.on('next', function(data) {
				data.should.eql({command:'next'})
				done()
			})
	})

	it('emits an event for each tasks array', function(done) {
		var task = createTask()
		es.readArray([ [1,2] ])
			.pipe(task)
			.on('tasks', function(array) {
				array.should.eql([1,2])
				done()
			})
	})

	it('emits a heartbeat for heartbeat messages', function(done){
		var task = createTask()
		es.readArray([{stream: '__heartbeat'}])
			.pipe(task)
			.on('__heartbeat', function(data) {
				data.should.eql({stream: '__heartbeat'})
				done()
			})
	})

	it('emits an event for each tuple', function(done) {
		var task = createTask()
		es.readArray([{id:1}])
			.pipe(task)
			.on('tuple', function(data) {
				data.should.eql({id:1})
				done()
			})
	})

})
