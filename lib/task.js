var through = require('event-stream').through
var createCollector = require('./collector')
var component = require('./component')

module.exports = function() {
	var task = through(function(data) {
		if (data instanceof Array) {
			this.emit('tasks', data)
		} else if (data.command) {
			this.emit(data.command, data)
		} else if (data.stream == '__heartbeat') {
			this.emit('__heartbeat', data)
		} else {
			this.emit('tuple', data)
		}
	}, function() {
		collector.end()
	})

	var collector = createCollector(task)
	task.collector = collector

	return component.call(task)
}
