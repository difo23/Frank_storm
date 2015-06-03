var component = require('../lib/component')

describe('component', function() {

	beforeEach(function() {
		this.component = component.call({
			spec: {
				common: {}
			}
		})
	})

	describe('declareStream', function() {

		it('declares a new stream', function() {
			this.component.declareStream('test', ['field'])
			this.component.spec.common.streams.test.should.eql({direct: false, output_fields: ['field']})
		})

		it('declares a new direct stream', function() {
			this.component.declareStream('test', true, ['field'])
			this.component.spec.common.streams.test.should.eql({direct: true, output_fields: ['field']})
		})

		it('throws an error if a stream with the given ID was already declared', function() {
			function declareDuplicateStream() {
				this.component.declareStream('test', false, ['field'])
					.declareStream('test', true, ['field'])
			}
			declareDuplicateStream.bind(this).should.throw()
		})

	})

	describe('declareOutputFields', function() {

		it('declares the default stream', function() {
			this.component.declareOutputFields(['field'])
			this.component.spec.common.streams.default.should.eql({direct: false, output_fields: ['field']})
		})

	})

})
