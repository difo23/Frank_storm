module.exports = function(handshake, topology) {
	var context = handshake.context
	var taskComponentMap = context['task->component']
	var thisComponentId = taskComponentMap[context.taskid]

	return {
		pidDir: function(){
			return handshake.pidDir;
		},
		config: function(key) {
			if(key && !!handshake.conf){
				return handshake.conf[key];
			} else {
				return handshake.conf;
			}
		},
		componentId: function() {
			return thisComponentId
		},
		taskId: function() {
			return context.taskid
		},
		downstreamTasks: function(streamId) {
			if (streamId == null) {
				streamId = 'default'
			}
			var downstreamTasks = []
			for (var taskId in taskComponentMap) {
				var componentId = taskComponentMap[taskId]
				var bolt = topology.bolts[componentId]
				if (bolt != null) {
					for (var globalStreamId in bolt.common.globalStreamIds) {
						var stream = bolt.common.globalStreamIds[globalStreamId]
						if (stream.componentId == thisComponentId && stream.streamId == streamId) {
							downstreamTasks.push(taskId)
						}
					}
				}
			}
			return downstreamTasks
		},
		upstreamTasks: function(streamId) {
			if (streamId == null) {
				streamId = 'default'
			}
			var upstreamTasks = []
			var thisComponent = topology.bolts[thisComponentId]
			var upstreamComponents = {}
			for (var globalStreamId in thisComponent.common.globalStreamIds) {
				var stream = thisComponent.common.globalStreamIds[globalStreamId]
				if (stream.streamId == streamId) {
					upstreamComponents[stream.componentId] = 1
				}
			}
			for (var taskId in taskComponentMap) {
				var componentId = taskComponentMap[taskId]
				if (upstreamComponents[componentId]) {
					upstreamTasks.push(taskId)
				}
			}
			return upstreamTasks
		}
	}
}
