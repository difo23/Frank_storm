var formatter = require('../lib/formatter')
var es = require('event-stream')

describe('formatter', function() {

	it('formats the storm multilang protocol', function(done) {
		es.readArray([{a:1},{b:2}])
			.pipe(formatter())
			.pipe(es.wait(function(err, text) {
				(err == null).should.be.true
				text.should.eql('{"a":1}\nend\n{"b":2}\nend\n')
				done()
			}))

	})

})
