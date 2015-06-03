var fs = require('fs')
var path = require('path')
var config = require('../config')
var es = require('event-stream')

var log = {
	stdin: function(worker){
		return log._stream(worker, 'stdin')
	},
	stdout: function(worker){
		return log._stream(worker, 'stdout')
	},
	_stream: function(worker, suffix){
		return es.map(function (data, callback) {
			var context = ((worker || {}).task || {}).context;
			if(context && context.config(config.DEBUG_WORKER_STREAMS)){
				var directory = context.pidDir();
				var filename = './'+process.pid+"."+suffix;
				fs.appendFile(path.resolve(directory, filename), data, function(err){
					callback(err, data);
				});
			} else {
				callback(null, data);
			}
		});
	}
};
module.exports = log;
