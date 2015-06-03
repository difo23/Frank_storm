var parser = require('../lib/parser')
var es = require('event-stream')

describe('parser', function() {

	it('parses the storm multilang protocol', function(done) {
		es.readArray(['{"end":false}\nend\n{"end":true}\nend\n'])
			.pipe(parser())
			.pipe(es.writeArray(function(err, array) {
				(err == null).should.be.true
				array.should.eql([{end:false},{end:true}])
				done()
			}))

	})

})
