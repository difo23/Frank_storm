var ttypes = require('./gen-nodejs/storm_types')

//Extend with toString, so GlobalStreamId can be used as a hash key
ttypes.GlobalStreamId.prototype.toString = function() {
	return '' + this.componentId + '/' + this.streamId
}

//Track a separate map for global stream ids
//Also have to modify the generated code for ComponentCommon
//to serialize the input map correctly
ttypes.ComponentCommon.prototype.addInput = function(globalStreamId, grouping) {
	if (this.globalStreamIds == null) {
		this.globalStreamIds = {}
	}
	if (this.inputs == null) {
		this.inputs = {}
	}
	this.inputs[globalStreamId] = grouping
	this.globalStreamIds[globalStreamId] = globalStreamId
}

ttypes.ComponentCommon.prototype.getGlobalStreamId = function(inputKey) {
	return this.globalStreamIds[inputKey]
}

module.exports = function inputdeclarer(componentCommon) {
	function createGrouping(componentId, groupingType, args, streamId) {
		if (streamId == null) {
			streamId = 'default'
		}
		var globalStreamId = new ttypes.GlobalStreamId({
			componentId: componentId,
			streamId: streamId
		})
		var groupingSpec = {}
		groupingSpec[groupingType] = args
		componentCommon.addInput(globalStreamId, new ttypes.Grouping(groupingSpec))
		return declarer
	}
	var declarer = {
		allGrouping: function(componentId, streamId) {
			return createGrouping(componentId, 'all', new ttypes.NullStruct(), streamId)
		},

		directGrouping: function(componentId, streamId) {
			return createGrouping(componentId, 'direct', new ttypes.NullStruct(), streamId)
		},

		fieldsGrouping: function(componentId, fields, streamId) {
			return createGrouping(componentId, 'fields', fields, streamId)
		},

		globalGrouping: function(componentId, streamId) {
			return declarer.fieldsGrouping(componentId, [], streamId)
		},

		localOrShuffleGrouping: function(componentId, streamId) {
			return createGrouping(componentId, 'local_or_shuffle', new ttypes.NullStruct(), streamId)
		},

		noneGrouping: function(componentId, streamId) {
			return createGrouping(componentId, 'none', new ttypes.NullStruct(), streamId)
		},

		shuffleGrouping: function(componentId, streamId) {
			return createGrouping(componentId, 'shuffle', new ttypes.NullStruct(), streamId)
		}
	}
	return declarer
}
