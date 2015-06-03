var task = require('./task')
var types = require('./types')

module.exports = function (nextTuple) {
	var spout = task()
	function sync() {
		spout.collector.sync()
	}
	spout.on('next', function() {
		nextTuple.call(spout.collector, sync)
	})
	spout.spec = types.shellspout()
	//To handle ack or fail:
	//.on('ack', function(data) {})
	//.on('fail', function(data) {})
	return spout
}
