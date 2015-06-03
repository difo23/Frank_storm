var spawn = require('child_process').spawn
var split = require('event-stream').split
var fs = require('fs')
var nimbus = require('./nimbus')
var path = require('path')
var q = require('q')
var submit = require('./submitter').submitOrRun
var wrench = require('wrench')
var util = require('./util')
var drpc = require('./drpc')

module.exports = LocalCluster

function LocalCluster() {
	if (!(this instanceof LocalCluster)) {
		return new LocalCluster()
	}
	process.stdout.setMaxListeners(0)
	process.stderr.setMaxListeners(0)
	this._servers = []
	this._tails = {}
	this._stormLocalDir = '/tmp/storm-local'
	this._stormLogDirectory = this._getLogDirectory()
	this._afterStartup = this._start()
	this._topologies = []
}

LocalCluster.prototype._startServer = function(serverName, port) {
	var server = spawn('storm', [serverName,
		'-c', 'dev.zookeeper.path=storm-local/zookeeper',
		'-c', 'storm.local.dir=storm-local'],
		{cwd: '/tmp'}) //Hack because storm.local.dir doesn't seem to work as anything but "storm-local"
	server.stdout.pipe(process.stdout)
	server.stderr.pipe(process.stderr)

	if (port != null) {
		return q.nfcall(util.waitForPortListener, port, 60000).then(function() {
			return server
		})
	} else {
		return q.when(server)
	}
}

LocalCluster.prototype._start = function() {
	if (!process.stdin.isTTY) {
		//Do not start if not a TTY
		return q.when()
	}

	var self = this

	//Start with a clean directory
	if (fs.existsSync(self._stormLocalDir)) {
		wrench.rmdirSyncRecursive(self._stormLocalDir)
	}

	//Launch processes in order
	var afterStartup = self._startServer('dev-zookeeper', 2181).then(function(zookeeper) {
		return [
			zookeeper,
			self._startServer('nimbus', 6627),
			self._startServer('drpc', 3772),
			self._startServer('supervisor'),
			self._startServer('ui')
		]
	}).spread(function(zookeeper, nimbus, drpc, supervisor) {
		self._servers = [zookeeper, nimbus, drpc, supervisor]
		return self._servers
	})

	while (!fs.existsSync(self._stormLogDirectory)) {
		//Waiting for directory if it doesn't exist
	}

	var logFiles = fs.readdirSync(self._stormLogDirectory)

	self._tails = {}
	logFiles.forEach(function(logFile) {
		self._tails[logFile] = self._tailFile(logFile)
	})

	this._logWatcher = fs.watch(self._stormLogDirectory, this._onLogDirectoryChange.bind(self))

	return afterStartup
}

LocalCluster.prototype._getLogDirectory = function() {
	var searchPaths = process.env.PATH.split(':')
	for (var i = 0, ii = searchPaths.length; i < ii; ++i) {
		var searchPath = searchPaths[i]
		var stormBin = path.join(searchPath, 'storm')
		if (fs.existsSync(stormBin)) {
			searchPath = path.dirname(fs.realpathSync(stormBin))
			return path.resolve(searchPath, '../logs')
		}
	}
	throw new Error('Storm was not found on your $PATH')
}

LocalCluster.prototype._tailFile = function(file) {
	var tail = spawn('tail', ['-n', '0', '-f', path.join(this._stormLogDirectory, file)])
	tail.stdout.pipe(process.stdout)
	tail.stderr.pipe(process.stderr) //Warning about max listeners?
	return tail
}

LocalCluster.prototype._onLogDirectoryChange = function(event, logFile) {
	if (event == 'rename') {
		if (fs.existsSync(path.join(this._stormLogDirectory, logFile))) {
			this._tails[logFile] = this._tailFile(logFile)
		} else {
			this._tails[logFile].kill()
			delete this._tails[logFile]
		}
	}
}

LocalCluster.prototype._killTopologies = function() {
	var client = nimbus()
	var workerShutdown = q.defer()
	//Hacky way to decide if the worker process has shut down
	this._tails['supervisor.log'].stdout.pipe(split()).on('data', function(line) {
		if (line.indexOf('supervisor [INFO] Shut down') >= 0) {
			workerShutdown.resolve()
		}
	})
	return q.all(this._topologies.map(function(topologyName) {
		return client.killTopology(topologyName, {wait_secs:0})
	})).then(function() {
		return workerShutdown.promise
	})
}

LocalCluster.prototype._stopServer = function(server) {
	var deferred = q.defer()
	server.once('exit', function() {
		deferred.resolve()
	})
	server.kill('SIGINT')
	return deferred.promise
}

LocalCluster.prototype._stopServers = function() {
	var self = this
	var childProcesses = [].concat(self._servers)

	for (var logFile in self._tails) {
		if (self._tails.hasOwnProperty(logFile)) {
			childProcesses.push(self._tails[logFile])
		}
	}

	return q.all(childProcesses.map(function(childProcess) {
		return self._stopServer(childProcess)
	}))
}

LocalCluster.prototype.submit = function(topology, options, callback) {
	var self = this
	return self._afterStartup.then(function() {
		return submit(topology, options)
	}).then(function(topologyName) {
		self._topologies.push(topologyName)
		return topologyName
	}).nodeify(callback)
}

LocalCluster.prototype.execute = function(functionName, functionArgs, callback) {
	var client = drpc.client()
	return client.execute(functionName, functionArgs).nodeify(callback)
}

LocalCluster.prototype.shutdown = function(callback) {
	var self = this

	if (self._logWatcher) {
		self._logWatcher.close()
	}

	return self._killTopologies().then(function() {
		return self._stopServers()
	}).nodeify(callback)
}
