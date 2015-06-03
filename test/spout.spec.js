var spout = require('../lib/spout')
var es = require('event-stream')

describe('spout', function() {

	it('emits tuples and then syncs', function(done) {
		es.readArray([{command: 'next'}, {command: 'next'}])
			.pipe(spout(function(sync) {
				this.emit([1])
				this.emit([2])
				sync()
			}))
			.pipe(es.writeArray(function(err, array) {
				array.should.eql([
					{command: 'emit', tuple: [1]},
					{command: 'emit', tuple: [2]},
					{command: 'sync'},
					{command: 'emit', tuple: [1]},
					{command: 'emit', tuple: [2]},
					{command: 'sync'}
				])
				done()
			}))
	})

})
