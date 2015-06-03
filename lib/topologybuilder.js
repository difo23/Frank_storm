var inputdeclarer = require('./inputdeclarer')
var ttypes = require('./gen-nodejs/storm_types')

function validateUnusedId(id, topologySpec) {
	if (topologySpec.bolts[id] != null) {
		throw new Error('Bolt has already been declared for id ' + id)
	}
	if (topologySpec.spouts[id] != null) {
		throw new Error('Spout has already been declared for id ' + id)
	}
}

module.exports = function() {
	var tasks = {}
	var topologySpec = new ttypes.StormTopology({
		bolts: {},
		spouts: {},
		state_spouts: {}
	})

	return {
		setBolt: function(id, bolt, parallelismHint) {
			validateUnusedId(id, topologySpec)
			if (parallelismHint != null) {
				bolt.spec.common.parallelism_hint = parallelismHint
			}
			topologySpec.bolts[id] = bolt.spec
			tasks[id] = bolt
			return inputdeclarer(bolt.spec.common)
		},

		setSpout: function(id, spout, parallelismHint) {
			validateUnusedId(id, topologySpec)
			if (parallelismHint != null) {
				spout.spec.common.parallelism_hint = parallelismHint
			}
			topologySpec.spouts[id] = spout.spec
			tasks[id] = spout
		},

		createTopology: function() {
			topologySpec.tasks = tasks
			return topologySpec
		}
	}
}
