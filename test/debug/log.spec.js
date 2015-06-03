var fs = require('fs')
var sinon = require('sinon')
var es = require('event-stream')
var _  = require('lodash')

var log = require('../../lib/debug/log')
var config = require('../../lib/config')

describe('debug/log', function(){
	beforeEach(function(){
		this.sandbox = sinon.sandbox.create();
		this.sandbox.stub(fs, 'appendFile').yields();
	})
	afterEach(function(){
		this.sandbox.restore();
	})

	describe('stdin', function(){
		it('should _stream to a stdin file', function(){
			this.sandbox.stub(log, '_stream').returns('foo')
			log.stdin('worker').should.eql('foo')
			log._stream.calledWith('worker', 'stdin').should.be.true
		});
	})
	describe('stdout', function(){
		it('should _stream to a stdout file', function(){
			this.sandbox.stub(log, '_stream').returns('foo')
			log.stdin('worker').should.eql('foo')
			log._stream.calledWith('worker', 'stdin').should.be.true
		});
	})

	describe('_stream', function(){
		beforeEach(function(){
			this.context = {
				config: sinon.stub(),
				pidDir: sinon.stub()
			}
			this.worker = {
				task: {
					context: this.context
				}
			}
		});

		it('should return a readable/writable stream', function(){
			var result = log._stream();
			result.writable.should.be.true
			result.readable.should.be.true
			_.isFunction(result.write).should.be.true
		})

		describe('when configured to debug/log streams', function(){
			beforeEach(function(){
				this.context.config.withArgs(config.DEBUG_WORKER_STREAMS).returns(true);
				this.context.pidDir.returns('/pidDir');
			})
			it('should append log messages', function(done){
				es.readArray(['foo', 'bar'])
					.pipe(log._stream(this.worker, 'suffix'))
					.pipe(es.writeArray(function(err, array) {
						array.should.eql(['foo', 'bar']);
						fs.appendFile.calledWith('/pidDir/'+process.pid+'.suffix', 'foo').should.be.true
						fs.appendFile.calledWith('/pidDir/'+process.pid+'.suffix', 'bar').should.be.true
						done()
					}));
			});
			it('should pass messages through', function(done){
				es.readArray(['foo', 'bar'])
					.pipe(log._stream(this.worker, 'suffix'))
					.pipe(es.writeArray(function(err, array) {
						array.should.eql(['foo', 'bar']);
						done()
					}));
			});
		});

		describe('when configured NOT to debug/log streams', function(){
			beforeEach(function(){
				this.context.config.withArgs(config.DEBUG_WORKER_STREAMS).returns(false);
			})
			it('should NOT append log messages', function(done){
				es.readArray(['foo', 'bar'])
					.pipe(log._stream(this.worker, 'suffix'))
					.pipe(es.writeArray(function(err, array) {
						fs.appendFile.called.should.be.false;
						done()
					}))
			});
			it('should pass messages through', function(done){
				es.readArray(['foo', 'bar'])
					.pipe(log._stream(this.worker, 'suffix'))
					.pipe(es.writeArray(function(err, array) {
						array.should.eql(['foo', 'bar']);
						done()
					}));
			});
		});


	})
})
