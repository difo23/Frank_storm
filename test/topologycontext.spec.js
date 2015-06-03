var basicbolt = require('../lib/basicbolt')
var topologybuilder = require('../lib/topologybuilder')
var topologycontext = require('../lib/topologycontext')

describe('topologycontext', function() {

	beforeEach(function() {
		var noop = function () {}
		var builder = topologybuilder()
		builder.setBolt('first', basicbolt(noop))
		builder.setBolt('second', basicbolt(noop)).noneGrouping('first')
		builder.setBolt('third', basicbolt(noop)).noneGrouping('second')
		this.topology = builder.createTopology()
	})

	describe('config', function() {

		it('returns the config from the handshake', function() {
			var conf = {}
			var context = topologycontext({
				conf: conf,
				context: {
					'task->component': {}
				}
			})
			context.config().should.equal(conf)
		})

	})

	describe('componentId', function() {

		it('returns the component id', function() {
			var context = topologycontext({
				context: {
					'task->component': {
						'1': '__acker',
						'2': 'first',
						'3': 'second',
						'4': 'third'
					},
					taskid: 2
				}
			})
			context.componentId().should.eql('first')
		})

	})

	describe('taskId', function() {

		it('returns the task id from the handshake', function() {
			var conf = {}
			var context = topologycontext({
				conf: conf,
				context: {
					'task->component': {},
					'taskid': 2
				}
			})
			context.taskId().should.eql(2)
		})

	})

	describe('downstreamTasks', function() {

		beforeEach(function() {
			this.context = topologycontext({
				context: {
					'task->component': {
						'1': '__acker',
						'2': 'first',
						'3': 'second',
						'4': 'second',
						'5': 'third',
						'6': 'third',
						'7': 'third'
					},
					taskid: 3
				}
			}, this.topology)
		})

		it('returns downstream tasks', function() {
			this.context.downstreamTasks().should.eql(['5', '6', '7'])
		})

	})

	describe('upstreamTasks', function() {

		beforeEach(function() {
			this.context = topologycontext({
				context: {
					'task->component': {
						'1': '__acker',
						'2': 'first',
						'3': 'first',
						'4': 'first',
						'5': 'second',
						'6': 'second',
						'7': 'third'
					},
					taskid: 5
				}
			}, this.topology)
		})

		it('returns upstream tasks', function() {
			this.context.upstreamTasks().should.eql(['2', '3', '4'])
		})

	})

})
