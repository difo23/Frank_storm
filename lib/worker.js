var parser = require('./parser')
var formatter = require('./formatter')
var prepare = require('./prepare')
var fs = require('fs')
var path = require('path')
var es = require('event-stream')
var q = require('q')
var topologycontext = require('./topologycontext')
var config = require('./config')
var log = require('./debug/log')

module.exports = function(topology) {
	var front = parser()
	var back = formatter()
	var worker = es.duplex(front, back)
	var context = null;
	var frontmatter = front.pipe(prepare())
		.on('prepare', function(handshake) {
			//Query the topology context to figure out which task to run
			context = topologycontext(handshake, topology)
			var id = context.componentId()
			var task = worker.task = topology.tasks[id]
			if (task == null) {
				worker.emit('error', new Error('Task with id ' + id + ' not found'))
			} else {
				task.context = context;
				//Finish piping the stream
				frontmatter.removeAllListeners() //Crude unpipe... since the prepare stream is internal, should be okay
				frontmatter.pipe(task)
					.pipe(back)

				var pid = process.pid
				fs.writeFileSync(path.join(context.pidDir(), '' + pid), '')
				task.queue({pid:pid})

				task.emit('prepare', context)
			}
		})

	//Temporarily pipe to back, but will undo this if a 'prepare' event fires
	frontmatter.pipe(back)

	worker.run = function(stdin, stdout) {
		var deferred = q.defer()

		if (stdin == null) {
			stdin = process.stdin
		}
		if (stdout == null) {
			stdout = process.stdout
		}
		if (stdin.isTTY) {
			// Running a worker from a TTY makes no sense
			deferred.reject()
		} else {
			stdin
				.pipe(log.stdin(this))
				.pipe(worker)
				.on('end', function() {
					if (worker.task) {
						// Found storm multi-lang messages on stdin
						deferred.resolve()
					} else {
						// Did not find storm multi-lang message on stdin
						deferred.reject()
					}
				})
				.pipe(log.stdout(this))
				.pipe(stdout)
		}

		return deferred.promise
	}

	return worker
}
