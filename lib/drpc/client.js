var DistributedRPCClient = require('../gen-nodejs/DistributedRPC').Client
var thriftclient = require('../thriftclient')

module.exports = thriftclient(DistributedRPCClient, 3772)
