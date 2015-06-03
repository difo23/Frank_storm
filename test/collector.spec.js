var createTask = require('../lib/task')
var es = require('event-stream')

describe('collector', function() {

	describe('log', function() {

		it('logs a message', function(done) {
			var task = createTask()
			es.readArray([])
				.pipe(task)
				.pipe(es.writeArray(function(err, array) {
					array.should.eql([{command: 'log', msg: 'test log'}])
					done()
				}))
			task.collector.log('test log')
		})

	})

	describe('ack', function() {

		it('acknowledges a tuple', function(done) {
			var task = createTask()
			es.readArray([])
				.pipe(task)
				.pipe(es.writeArray(function(err, array) {
					array.should.eql([{command: 'ack', id: 1}])
					done()
				}))
			task.collector.ack({id: 1})
		})

	})

	describe('fail', function() {

		it('fails a tuple', function(done) {
			var task = createTask()
			es.readArray([])
				.pipe(task)
				.pipe(es.writeArray(function(err, array) {
					array.should.eql([{command: 'fail', id: 1}])
					done()
				}))
			task.collector.fail({id: 1})
		})

	})

	describe('sync', function() {

		it('syncs a shell spout', function(done) {
			var task = createTask()
			es.readArray([])
				.pipe(task)
				.pipe(es.writeArray(function(err, array) {
					array.should.eql([{command: 'sync'}])
					done()
				}))
			task.collector.sync()
		})

	})

	describe('emit', function() {

		it('emits a tuple', function(done) {
			var task = createTask()
			es.readArray([])
				.pipe(task)
				.pipe(es.writeArray(function(err, array) {
					array.should.eql([{command: 'emit', tuple: ['test']}])
					done()
				}))
			task.collector.emit(['test'])
		})

		it('emits a tuple with options', function(done) {
			var task = createTask()
			es.readArray([])
				.pipe(task)
				.pipe(es.writeArray(function(err, array) {
					array.should.eql([{command: 'emit', tuple: ['test'], stream: '1'}])
					done()
				}))
			task.collector.emit(['test'], {stream: '1'})
		})

		it('returns the tasks a tuple was sent to', function(done) {
			var task = createTask()
			es.readArray([ ['2', '4'], ['3', '5'] ])
				.pipe(task)
			task.collector.emit(['test1'])
			task.collector.emit(['test2']).then(function(tasks) {
				tasks.should.eql(['3', '5'])
				done()
			})
		})

		it('returns the tasks a tuple was sent to for a direct emit', function(done) {
			var task = createTask()
			es.readArray([])
				.pipe(task)
			task.collector.emit(['test1'], {task: '3'}).then(function(tasks) {
				tasks.should.eql(['3'])
				done()
			})
		})

	})

	describe('heartbeat', function() {
		it('emits a sync command when a heartbeat message is received', function(done){
			var task = createTask()
			es.readArray([{stream: '__heartbeat'}])
				.pipe(task)
				.pipe(es.writeArray(function(err, array) {
					array.should.eql([
						{command: 'sync'},
					])
					done()
				}))
		})
	})

	describe('end', function() {

		it('ends the stream after all tuples have been acked or failed', function(done) {
			var task = createTask()
			es.readArray([{id: '1'}, {id: '2'}])
				.pipe(task)
				.on('tuple', function(data) {
					//Defer the ack a bit
					process.nextTick(function() {
						if (data.id == '1') {
							task.collector.ack(data)
						} else {
							task.collector.fail(data)
						}
					})
				})
				.pipe(es.writeArray(function(err, array) {
					array.should.eql([
						{command: 'ack', id: '1'},
						{command: 'fail', id: '2'}
					])
					done()
				}))
		})

		it('ends the stream after all next commands have been synced', function(done) {
			var task = createTask()
			es.readArray([{command: 'next'}, {command: 'next'}])
				.pipe(task)
				.on('next', function() {
					//Defer the sync a bit
					process.nextTick(function() {
						task.collector.sync()
					})
				})
				.pipe(es.writeArray(function(err, array) {
					array.should.eql([
						{command: 'sync' },
						{command: 'sync' }
					])
					done()
				}))
		})

	})

})
