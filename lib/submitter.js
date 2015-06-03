var exec = require('child_process').exec
var fs = require('fs')
var nimbus = require('./nimbus')
var os = require('os')
var path = require('path')
var q = require('q')
var util = require('./util')
var wrench = require('wrench')
var worker = require('./worker')

function jar(moduleDirectory) {
	var filename = 'stormshell-' + new Date().getTime()
	var tempDir = path.join(os.tmpdir(), filename)
	var jarFile = tempDir + '.jar'

	//Make sure the directory doesn't already exist for some reason
	if (fs.existsSync(tempDir)) {
		wrench.rmdirSyncRecursive(tempDir)
	}

	wrench.mkdirSyncRecursive(tempDir)

	//Copy the module directory to a resources directory in the temp directory
	wrench.copyDirSyncRecursive(moduleDirectory, path.join(tempDir, 'resources'), {
		excludeHiddenUnix: true
	})

	//Create the jar file
	return q.nfcall(exec, 'jar cf ' + jarFile + ' .', {cwd: tempDir}).then(function() {
		//Return the location of the created jar file
		return jarFile
	}).finally(function() {
		//Clean up
		wrench.rmdirSyncRecursive(tempDir)
	})
}

function uploadJar(jarFile, nimbusHost) {
	var chunkSize = 307200 //https://github.com/apache/incubator-storm/blob/v0.9.2-incubating/storm-core/src/jvm/backtype/storm/StormSubmitter.java#L50
	var client = nimbus(nimbusHost)
	var jarFileSize =  fs.statSync(jarFile).size
	function uploadWhileChunksRemaining(fd, position, uploadedJarLocation) {
		var buffer = new Buffer(chunkSize)
		var bytesRead = fs.readSync(fd, buffer, 0, chunkSize, position)

		if (bytesRead < buffer.length) {
			buffer = buffer.slice(0, bytesRead)
		}

		return client.uploadChunk(uploadedJarLocation, buffer).then(function() {
			var nextPosition = position + bytesRead
			if (nextPosition < jarFileSize) {
				return uploadWhileChunksRemaining(fd, nextPosition, uploadedJarLocation)
			} else {
				return uploadedJarLocation
			}
		})
	}
	return client.beginFileUpload().then(function(uploadedJarLocation) {
		var fd = fs.openSync(jarFile, 'r')
		return uploadWhileChunksRemaining(fd, 0, uploadedJarLocation).finally(function() {
			fs.closeSync(fd)
		})
	}).then(function(uploadedJarLocation) {
		return [uploadedJarLocation, client.finishFileUpload(uploadedJarLocation)]
	}).spread(function(uploadedJarLocation) {
		return uploadedJarLocation
	})
}

exports.submit = function (topology, options, callback) {
	if (typeof options == 'function') {
		callback = options
		options = {}
	}
	//Default to the name of the main module
	if (options.name == null) {
		options.name = path.basename(require.main.filename, path.extname(require.main.filename))
	}
	//Default to the directory of the main module
	if (options.directory == null) {
		options.directory = util.topologyDirectory()
	}
	//Default to empty config
	if (options.config == null) {
		options.config = {}
	}

	return jar(options.directory).then(function(localJarLocation) {
		return uploadJar(localJarLocation, options.nimbus).finally(function() {
			fs.unlinkSync(localJarLocation)
		})
	}).then(function(uploadedJarLocation) {
		var client = nimbus(options.nimbus)
		return client.submitTopology(options.name, uploadedJarLocation, JSON.stringify(options.config), topology)
	}).then(function() {
		return options.name
	}).nodeify(callback)
}

exports.submitOrRun = function (topology, options, callback) {
	//Try to run the topology first
	return worker(topology).run().fail(function() {
		//... then fall back on submitting the topology
		return exports.submit(topology, options)
	}).nodeify(callback)
}
