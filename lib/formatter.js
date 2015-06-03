var through = require('event-stream').through

module.exports = function() {
	return through(function(data) {
		this.queue(JSON.stringify(data) + '\nend\n')
	})
}
