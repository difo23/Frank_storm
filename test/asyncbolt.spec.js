var asyncbolt = require('../lib/asyncbolt')
var es = require('event-stream')
var async = require('async')

describe('asyncbolt', function() {

	it('should not ack the tuple if callback specifies not to', function(done){
		es.readArray([{id: '1', tuple: ['test1']}])
			.pipe(asyncbolt(function(data, callback) {
				this.emit(data.tuple)
				callback(null, {ack: false})
			}))
			.pipe(es.writeArray(function(err, array) {
				array.should.eql([
					{command: 'emit', tuple: ['test1'], anchors: ['1']}
				])
				done()
			}))
	})

	it('processes tuples and automatically acks and anchors', function(done) {
		es.readArray([{id: '1', tuple: ['test1']}, {id: '2', tuple: ['test2']}])
			.pipe(asyncbolt(function(data, callback) {
				this.emit(data.tuple)
				callback()
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

	it('should anchor tuples correctly even when processed out of orer', function(done) {
		es.readArray([{id: '1', tuple: ['test1']}, {id: '2', tuple: ['test2']}])
			.pipe(asyncbolt(function(data, callback) {
				var toDo = function(){
					this.emit(data.tuple)
					callback()
				}.bind(this);
				(data.id == 1) ? async.nextTick(toDo) : toDo()
			}))
			.pipe(es.writeArray(function(err, array) {
				array.should.eql([
					{command: 'emit', tuple: ['test2'], anchors: ['2']},
					{command: 'ack', id: '2'},
					{command: 'emit', tuple: ['test1'], anchors: ['1']},
					{command: 'ack', id: '1'}
				])
				done()
			}))
	})

	it('catches errors, logs them, and fails the tuple', function(done) {
		es.readArray([{id: '1', tuple: ['test1']}])
			.pipe(asyncbolt(function(data, callback) {
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

	it('handles errors on callback, logs them, and fails the tuple', function(done) {
		es.readArray([{id: '1', tuple: ['test1']}])
			.pipe(asyncbolt(function(data, callback) {
				callback(new Error('test'))
			}))
			.pipe(es.writeArray(function(err, array) {
				array.should.have.length(2)
				array[0].command.should.eql('log')
				array[0].msg.toString().should.startWith('Error: test')
				array[1].should.eql({command: 'fail', id: '1'})
				done()
			}))
	})

})
