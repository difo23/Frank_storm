var component = require('../component')
var types = require('../types')
var uuid = require('node-uuid')
var basicbolt = require('../basicbolt')

exports.spout = function(functionName) {
	var spout = component.call({
		spec: types.javaspout('backtype.storm.drpc.DRPCSpout', { string_arg: functionName })
	})
	spout.declareOutputFields(['args', 'return-info'])
	return spout
}

exports.joinresult = function(returnComponent) {
	var joinresult = component.call({
		spec: types.javabolt('backtype.storm.drpc.JoinResult', { string_arg: returnComponent })
	})
	joinresult.declareOutputFields(['result', 'return-info'])
	return joinresult
}

exports.preparerequest = function() {
	var preparerequest = basicbolt(function(data) {
		var requestArgs = data.tuple[0]
		var returnInfo = data.tuple[1]
		var requestId = uuid()
		this.emit([requestId, requestArgs], {stream: args})
		this.emit([requestId, returnInfo], {stream: ret})
		this.emit([requestId], {stream: id})
	})
	preparerequest.declareStream(args, ['request', 'args'])
	preparerequest.declareStream(ret, ['request', 'return'])
	preparerequest.declareStream(id, ['request'])
	return preparerequest
}
var args = exports.preparerequest.args = 'default'
var id = exports.preparerequest.id = 'id'
var ret = exports.preparerequest.ret = 'ret'

exports.returnresults = function() {
	return component.call({
		spec: types.javabolt('backtype.storm.drpc.ReturnResults')
	})
}

exports.client = require('./client')
