module.exports = RequestTracker

function RequestTracker(expectedReportCount, downstreamTasks) {
	this.expectedReportCount = expectedReportCount
	this.downstreamTasks = downstreamTasks
	this.requests = {}
}

RequestTracker.prototype.isFinished = function(requestId) {
	var requestInfo = this.requests[requestId]
	if (this.expectedReportCount === 0) {
		// No expected reports, so we're done as soon as we ack/fail the tuple
		return true
	}
	if (requestInfo == null) {
		return false
	}
	return (requestInfo.receivedTuples === requestInfo.expectedTupleCount
		&& requestInfo.reportCount === this.expectedReportCount)
}

RequestTracker.prototype.stopTracking = function(requestId) {
	delete this.requests[requestId]
}

RequestTracker.prototype.receivedTuple = function(requestId) {
	var requestInfo = this._getRequestInfo(requestId)
	requestInfo.receivedTuples++
}

RequestTracker.prototype.expectTupleCount = function(requestId, count) {
	var requestInfo = this._getRequestInfo(requestId)
	requestInfo.reportCount++
	requestInfo.expectedTupleCount += count
}

RequestTracker.prototype.sentTuple = function(requestId, taskIds) {
	var requestInfo = this._getRequestInfo(requestId)
	for (var i = 0, ii = taskIds.length; i < ii; ++i) {
		var taskId = taskIds[i]
		if (requestInfo.taskEmittedTuples[taskId] == null) {
			requestInfo.taskEmittedTuples[taskId] = 0
		}
		requestInfo.taskEmittedTuples[taskId]++
	}
}

RequestTracker.prototype.eachCountByTask = function(requestId, callback) {
	var requestInfo = this.requests[requestId]
	if (requestInfo != null) {
		var taskEmittedTuples = requestInfo.taskEmittedTuples
		for (var i = 0, ii = this.downstreamTasks.length; i < ii; ++i) {
			var taskId = parseInt(this.downstreamTasks[i], 10)
			var count = taskEmittedTuples[taskId] || 0
			callback(taskId, count)
		}
	}
}

RequestTracker.prototype._getRequestInfo = function(requestId) {
	var requestInfo = this.requests[requestId]
	if (requestInfo == null) {
		requestInfo = {
			reportCount: 0,
			expectedTupleCount: 0,
			receivedTuples: 0,
			taskEmittedTuples: {}
		}
		this.requests[requestId] = requestInfo
	}
	return requestInfo
}
