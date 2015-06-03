var zookeeper = require('node-zookeeper-client');
var config = require('./config');
var _ = require('lodash')

module.exports = {

	getOptions: function(collector){

		var context = collector.context();
		var useStormZookeeper = context.config(config.TRANSACTIONAL_USE_STORM_ZOOKEEPER);
		var servers = (useStormZookeeper) ? context.config('storm.zookeeper.servers') : context.config(config.TRANSACTIONAL_ZOOKEEPER_SERVERS);
		var port = (useStormZookeeper) ? context.config('storm.zookeeper.port') : context.config(config.TRANSACTIONAL_ZOOKEEPER_PORT);
		var rootPath = context.config(config.TRANSACTIONAL_ZOOKEEPER_ROOT_PATH) || '/transaction';
		var connectionString = _.map(servers, function(server){
			var str = server
			if(port){
				str += ":"+port;
			}
			return str;
		}).join(',');
		return {
			servers: servers,
			port: port,
			rootPath: rootPath,
			connectionString: connectionString
		}
	},

	getClient: function(collector, options){
		if(!zk){
			zk = q.defer();
			client = zookeeper.createClient(options.connectionString);
			client.once('connected', function(){
				client.create(options.rootPath, null, function(err){
					if(err && err.getCode() != zookeeper.Exception.NODE_EXISTS){
						return zk.reject(err)
					}
					zk.resolve(client);

				});
			});
			client.connect();
		}

		return zk.promise;
	}

}
