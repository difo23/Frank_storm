var bolt = require('./bolt')

//basic bolts are synchronous only, for async support
//use bolt and do your own anchoring and acking
module.exports = function(process) {
	var anchors;
	var basicbolt = bolt(function(data) {
		anchors = [data.id]
		try {
			process.call(this, data)
			this.ack(data)
		} catch (e) {
			this.log(e.toString() + '\n' + e.stack)
			this.fail(data)
		}
	})
	var emit = basicbolt.collector.emit
	//Wrap the default emit to anchor to the input tuple
	basicbolt.collector.emit = function(tuple, options) {
		if (options == null) {
			options = {}
		}
		options.anchors = anchors
		return emit.call(this, tuple, options)
	}
	return basicbolt
}
