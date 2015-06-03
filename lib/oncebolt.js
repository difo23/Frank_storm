var asyncbolt = require('./asyncbolt');
var _ = require('lodash');
var zookeeper = require('node-zookeeper-client');
var q = require('q');
var path = require('path');
var config = require('./config');
var transactional = require('./transactional')

var zk = null;
/**
 *	Wraps an async bolt processing function to ensure it's only processed once.
 */
var once = function(process){
	return function(data, callback){
		var args = arguments;
		var options = transactional.getOptions.call(this);
		transactional.getClient(this, options)
			.then(function(client){
				var key = path.join(options.rootPath, ""+data.id);
				client.create(key, new Buffer('1'), function(err, results){
					if(err && err.getCode() == zookeeper.Exception.NODE_EXISTS){
						return callback();
					} else {
						return process.call(this, data, callback);
					}
				}.bind(this));
			}.bind(this))
			.fail(function(err){
				return callback(err)
			});
	}
}

module.exports = function(process){
	return asyncbolt(once(process));
}
