var basicbolt = require('../lib/basicbolt')
var es = require('event-stream')

describe('basicbolt', function() {

	it('processes tuples and automatically acks and anchors', function(done) {
		es.readArray([{id: '1', tuple: ['test1']}, {id: '2', tuple: ['test2']}])
			.pipe(basicbolt(function(data) {
				this.emit(data.tuple)
			}))
			.pipe(es.writeArray(function(err, array) {
				array.should.eql([
					{command: 'emit', tuple: ['test1'], anchors: ['1']},
					{command: 'ack', id: '1'},
					{command: 'emit', tuple: ['test2'], anchors: ['2']},
					{command: 'ack', id: '2'}
				])
				done()
			}))
	})

	it('catches errors, logs them, and fails the tuple', function(done) {
		es.readArray([{id: '1', tuple: ['test1']}])
			.pipe(basicbolt(function(data) {
				throw new Error('test')
			}))
			.pipe(es.writeArray(function(err, array) {
				array.should.have.length(2)
				array[0].command.should.eql('log')
				array[0].msg.should.startWith('Error: test')
				array[1].should.eql({command: 'fail', id: '1'})
				done()
			}))
	})

})
