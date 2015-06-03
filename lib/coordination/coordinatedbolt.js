var bolt = require('../bolt')
var RequestTracker = require('./requesttracker')
var q = require('q')

module.exports = function(process, finish) {
	var tracker = null
	var collectors = {}

	if (typeof finish != 'function') {
		finish = function() {
			//no-op by default
		}
	}

	function getCoordinatedCollector(requestId, collector) {
		var coordinatedCollector = collectors[requestId]
		if (coordinatedCollector != null) {
			// We already have a collector for this request
			return coordinatedCollector
		}

		var lastEmit = q.when()
		var finished = null
		coordinatedCollector = {
			ack: function() {
				var returnValue = collector.ack.apply(collector, arguments)
				tracker.receivedTuple(requestId)
				lastEmit.finally(function() {
					coordinatedCollector.finish()
				})
				return returnValue
			},
			emit: function() {
				lastEmit = collector.emit.apply(collector, arguments).then(function(taskIds) {
					tracker.sentTuple(requestId, taskIds)
				})
				return lastEmit
			},
			fail: function() {
				var returnValue = collector.fail.apply(collector, arguments)
				tracker.receivedTuple(requestId)
				lastEmit.finally(function() {
					coordinatedCollector.finish()
				})
				return returnValue
			},
			log: function() {
				return collector.log.apply(collector, arguments)
			},
			finish: function() {
				if (tracker.isFinished(requestId) && !finished) {
					// Finish callback can delay by returning a promise
					finished = q(finish.call(coordinatedCollector, requestId)).then(function() {
						return lastEmit
					}).then(function() {
						tracker.eachCountByTask(requestId, function(taskId, count) {
							collector.emit([requestId, count], { stream: coordinatedStreamId, task: taskId })
						})
						tracker.stopTracking(requestId)
						delete collectors[requestId]

						// Mostly just for testing...
						coordinatedbolt.emit('requestfinished', requestId)
					})
				}
			}
		}
		collectors[requestId] = coordinatedCollector
		return coordinatedCollector
	}

	var coordinatedbolt = bolt(function(data) {
		var requestId = data.tuple[0]
		var coordinatedCollector = getCoordinatedCollector(requestId, this)
		if (data.stream == coordinatedStreamId) {
			var count = data.tuple[1]
			tracker.expectTupleCount(requestId, count)
			this.ack(data)
			coordinatedCollector.finish()
		} else {
			process.call(coordinatedCollector, data)
		}
	})

	coordinatedbolt.on('prepare', function(context) {
		// Find tasks subscribed to this component's coordinated stream
		var downstreamTasks = context.downstreamTasks(coordinatedStreamId)

		// Find number of tasks we are expecting book-keeping tuples from
		var upstreamTasks = context.upstreamTasks(coordinatedStreamId)
		var expectedReportCount = upstreamTasks.length

		tracker = new RequestTracker(expectedReportCount, downstreamTasks)
	})

	coordinatedbolt.declareStream(coordinatedStreamId, true, ['id', 'count'])

	return coordinatedbolt
}

var coordinatedStreamId = module.exports.coordinatedStreamId = 'coord-stream'
