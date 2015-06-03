var fs = require('fs')
var net = require('net')
var path = require('path')

exports.waitForPortListener = function waitForPortListener(port, timeout, callback) {
	var delay = 1000
	function retryOrFail(err) {
		if (timeout > delay) {
			setTimeout(function() {
				waitForPortListener(port, timeout - delay, callback)
			}, delay)
		} else {
			callback(err)
		}
	}
	try {
		var client = net.connect({port:port}, function(err) {
			if (err) {
				retryOrFail(err)
			} else {
				client.end()
				callback()
			}
		}).on('error', retryOrFail)
	} catch (err) {
		retryOrFail(err)
	}
}

var topologyDirectory = exports.topologyDirectory = function topologyDirectory() {
	//Default to the directory of the main module
	var defaultDirectory = path.dirname(require.main.filename)

	//Search for a directory containing a package.json or node_modules directory
	var directory = defaultDirectory
	while (true) {
		if (fs.existsSync(path.join(directory, 'package.json')) ||
			fs.existsSync(path.join(directory, 'node_modules'))) {
			return directory
		} else if (directory == '/') {
			break
		} else {
			directory = path.dirname(directory)
		}
	}

	return defaultDirectory
}

exports.topologyScript = function topologyScript() {
	var directory = topologyDirectory()
	return path.relative(directory, require.main.filename)
}
