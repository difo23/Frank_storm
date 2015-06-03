var bolt = require('../lib/bolt')
var es = require('event-stream')

describe('bolt', function() {

	it('processes tuples', function(done) {
		es.readArray([{id: '1', tuple: ['test1']}, {id: '2', tuple: ['test2']}])
			.pipe(bolt(function(data) {
				this.emit(data.tuple)
				process.nextTick(function() {
					//Test asynchronous ack
					this.ack(data)
				}.bind(this))
			}))
			.pipe(es.writeArray(function(err, array) {
				array.should.eql([
					{command: 'emit', tuple: ['test1']},
					{command: 'emit', tuple: ['test2']},
					{command: 'ack', id: '1'},
					{command: 'ack', id: '2'}
				])
				done()
			}))
	})

})
