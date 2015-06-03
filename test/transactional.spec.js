var transactional = require('../lib/transactional')
var config = require('../lib/config')

var sinon = require('sinon')
var zookeeper = require('node-zookeeper-client')

describe('transactional', function() {
	beforeEach(function(){
		this.context = {
			config: sinon.stub()
		}
		this.collector = {
			context: function(){
				return this.context
			}.bind(this)
		}

	})
	describe('getOptions', function(){
		it('should using the storm zookeeper cluster when specified', function(){
			this.context.config.withArgs(config.TRANSACTIONAL_USE_STORM_ZOOKEEPER).returns(true)
			this.context.config.withArgs('storm.zookeeper.servers').returns(['server1', 'server2'])
			this.context.config.withArgs('storm.zookeeper.port').returns('port')
			options = transactional.getOptions(this.collector)
			options.connectionString.should.eql('server1:port,server2:port')
		});

		it('should default to using the specified transaction zookeeper servers', function(){
			this.context.config.withArgs(config.TRANSACTIONAL_USE_STORM_ZOOKEEPER).returns(undefined)
			this.context.config.withArgs(config.TRANSACTIONAL_ZOOKEEPER_SERVERS).returns(['server1', 'server2'])
			this.context.config.withArgs(config.TRANSACTIONAL_ZOOKEEPER_PORT).returns('port')
			options = transactional.getOptions(this.collector)
			options.connectionString.should.eql('server1:port,server2:port')
		});

		it('should default to /transaction as root path', function(){
			options = transactional.getOptions(this.collector)
			options.rootPath.should.eql('/transaction')
		});

		it('should use the specified root path for transactions', function(){
			this.context.config.withArgs(config.TRANSACTIONAL_ZOOKEEPER_ROOT_PATH).returns('/foobar')
			options = transactional.getOptions(this.collector)
			options.rootPath.should.eql('/foobar')
		});
	})
})
