var NimbusClient = require('./gen-nodejs/Nimbus').Client
var ttypes = require('./gen-nodejs/storm_types')
var thriftclient = require('./thriftclient')

var Nimbus = thriftclient(NimbusClient, 6627)

//WithOpts overloads
var submitTopology = Nimbus.prototype.submitTopology
Nimbus.prototype.submitTopology = function() {
	if (arguments.length >= 5) {
		arguments[4] = new ttypes.SubmitOptions(arguments[4])
		this.submitTopologyWithOpts.apply(this, arguments)
	} else {
		submitTopology.apply(this, arguments)
	}
}

var killTopology = Nimbus.prototype.killTopology
Nimbus.prototype.killTopology = function() {
	if (arguments.length >= 2) {
		arguments[1] = new ttypes.KillOptions(arguments[1])
		this.killTopologyWithOpts.apply(this, arguments)
	} else {
		killTopology.apply(this, arguments)
	}
}


module.exports = Nimbus
