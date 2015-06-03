var storm = require('../')

var exclaim = storm.basicbolt(function(data) {
	var arg = data.tuple[0]
	var retInfo = data.tuple[1]
	this.emit([arg + '!!!', retInfo])
}).declareOutputFields(['result', 'return-info'])

var builder = storm.topologybuilder()
builder.setSpout('drpc', storm.drpc.spout('exclamation'))
builder.setBolt('exclaim', exclaim, 3).shuffleGrouping('drpc')
builder.setBolt('return', storm.drpc.returnresults(), 3).shuffleGrouping('exclaim')

var options = {
	config: {
		'topology.debug': true,
		'drpc.servers': ['localhost']
	}
}
var topology = builder.createTopology()

var cluster = storm.localcluster()
cluster.submit(topology, options).then(function() {
	return cluster.execute('exclamation', 'aaa')
}).finally(function() {
	return cluster.shutdown()
}).then(console.log, console.error)
