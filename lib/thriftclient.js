var thrift = require('thrift')
var q = require('q')

module.exports = function(clientInterface, defaultPort) {
	function ThriftClient(thriftHost) {
		if (!(this instanceof ThriftClient)) {
			return new ThriftClient(thriftHost)
		}
		if (thriftHost == null) {
			thriftHost = 'localhost:' + defaultPort
		}
		var hostAndPort = thriftHost.split(':')
		this._host = hostAndPort[0]
		this._port = parseInt(hostAndPort[1] || defaultPort, 10)
	}

	var methods = []
	for (var method in clientInterface.prototype) {
		if (clientInterface.prototype.hasOwnProperty(method) &&
			typeof clientInterface.prototype[method] == 'function' &&
			method.indexOf('send_') < 0 &&
			method.indexOf('recv_') < 0) {
			methods.push(method)
		}
	}

	methods.forEach(function(method) {
		ThriftClient.prototype[method] = function() {
			var connected = q.defer()
			var connection = thrift.createConnection(this._host, this._port, {
				transport: thrift.TFramedTransport
			}).on('error', function(err) {
				connected.reject(err)
			}).on('timeout', function() {
				connected.reject(new Error('Thrift connection timed out'))
			}).on('connect', function() {
				connected.resolve()
			})
			var client = thrift.createClient(clientInterface, connection)
			return q.all([
				q.npost(client, method, arguments),
				connected.promise
			]).then(function(result) {
				return result[0]
			}).finally(function() {
				connection.end()
			})
		}
	})

	return ThriftClient
}
