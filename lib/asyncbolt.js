var bolt = require('./bolt')
var _ = require('lodash')

// Async bolts pass a callback to their processing method and ack
// after callback.
// Callback with options object
// 	'ack' - Defaults to true, whether the tuple should be ack'd
module.exports = function(process) {

	var asyncbolt = bolt(function(data) {
		var anchors = [data.id]
		var callback = function(err, options){
			if(err){
				this.log(err)
				this.fail(data)
			} else {
				options = options || {}
				options.ack = _.isUndefined(options.ack) ? true : options.ack;
				this.ack(data, !options.ack);
			}
		}.bind(this)
		try {
			// Clones and wraps 'emit()' in order to anchor the input tuple
			// in an asynchronous execution context
			var clone = _.clone(this)
			clone.emit = _.wrap(this.emit, function(emit, tuple, options){
				if (options == null) {
					options = {}
				}
				options.anchors = anchors
				return emit.call(this, tuple, options)
			}.bind(this));
			process.call(clone, data, callback);
		} catch (e) {
			callback(e.toString() + '\n' + e.stack);
		}
	});
	return asyncbolt
}
