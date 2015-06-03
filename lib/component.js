var ttypes = require('./gen-nodejs/storm_types')

module.exports = function() {
	this.declareOutputFields = function(fields) {
		return this.declareStream('default', false, fields)
	}

	this.declareStream = function(streamId, direct, fields) {
		if (fields == null) {
			fields = direct
			direct = false
		}
		if (this.spec.common.streams == null) {
			this.spec.common.streams = {}
		}
		if (this.spec.common.streams[streamId] != null) {
			throw new Error('Stream with id \"' + streamId + '\" is already defined')
		}
		this.spec.common.streams[streamId] = new ttypes.StreamInfo({
			direct: direct,
			output_fields: fields
		})
		return this
	}

	return this
}
