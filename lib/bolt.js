var task = require('./task')
var types = require('./types')

module.exports = function(process) {
	var bolt = task()
	bolt.on('tuple', function(data) {
		process.call(bolt.collector, data)
	})
	bolt.spec = types.shellbolt()
	return bolt
}
