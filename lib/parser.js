var es = require('event-stream')

module.exports = function() {
	return es.pipeline(
		es.split('\nend\n'),
		es.through(function(command) {
			command = command.trim()
			if (command) {
				this.queue(command)
			}
		}),
		es.parse()
	)
}
