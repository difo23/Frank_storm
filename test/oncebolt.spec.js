var oncebolt = require('../lib/oncebolt')
var es = require('event-stream')
var sinon = require('sinon')
var q = require('q')
var transactional = require('../lib/transactional')
var zookeeper = require('node-zookeeper-client')

describe('oncebolt', function() {

	beforeEach(function(){
		this.transactionalOptions = {
			rootPath: '/root'
		};
		this.sandbox = sinon.sandbox.create();
		this.sandbox.stub(transactional, 'getClient');
		this.sandbox.stub(transactional, 'getOptions').returns(this.transactionalOptions);

	})
	afterEach(function(){
		this.sandbox.restore();
	})



	describe('when processing messages normally', function(){

		beforeEach(function(){
			this.processed = {}
			this.client = {
				create: function(key, buffer, callback){
					if(this.processed[key]){
						callback({
							getCode: function(){
								return zookeeper.Exception.NODE_EXISTS
							}
						});
					}
					else {
						this.processed[key] = true
						callback()
					}
				}.bind(this)
			}
			transactional.getClient.returns(q.when(this.client));
		})

		it('should only process messages of a given id once', function(done) {
			var stub = sinon.stub()
			es.readArray([{id: '1', tuple: ['test1']}, {id: '1', tuple: ['test2']}])
				.pipe(oncebolt(function(data, callback) {
					this.emit(data.tuple)
					stub()
					callback()
				}))
				.pipe(es.writeArray(function(err, array) {
					try{
						stub.callCount.should.eql(1)
						array.should.eql([
							{command: 'emit', tuple: ['test1'], anchors: ['1']},
							{command: 'ack', id: '1'},
							{command: 'ack', id: '1'} // Acknowledged twice
						])
						done()
					} catch(err){
						done(err)
					}
				}))
		})

		it('processes tuples and automatically acks and anchors', function(done) {
			es.readArray([{id: '1', tuple: ['test1']}, {id: '2', tuple: ['test2']}])
				.pipe(oncebolt(function(data, callback) {
					this.emit(data.tuple)
					callback()
				}))
				.pipe(es.writeArray(function(err, array) {
					try{
						array.should.eql([
							{command: 'emit', tuple: ['test1'], anchors: ['1']},
							{command: 'ack', id: '1'},
							{command: 'emit', tuple: ['test2'], anchors: ['2']},
							{command: 'ack', id: '2'}
						])
						done()
					} catch(err){
						done(err)
					}
				}))
		})

		it('catches errors, logs them, and fails the tuple', function(done) {
			es.readArray([{id: '1', tuple: ['test1']}])
				.pipe(oncebolt(function(data, callback) {
					throw new Error('test')
				}))
				.pipe(es.writeArray(function(err, array) {
					array.should.have.length(2)
					array[0].command.should.eql('log')
					array[0].msg.toString().should.startWith('Error: test')
					array[1].should.eql({command: 'fail', id: '1'})
					done()
				}))
		})

		it('handles errors on callback, logs them, and fails the tuple', function(done) {
			es.readArray([{id: '1', tuple: ['test1']}])
				.pipe(oncebolt(function(data, callback) {
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

})
