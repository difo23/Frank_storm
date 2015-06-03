Build and run Storm topologies with Node.js.

# Prerequisites

1. Your Storm cluster should have Node.js installed and available on the system PATH.
1. The Jar utility needs to be on your PATH in order to package topologies.
1. In order to test Node.js Storm topologies with a "local cluster", you need to [install a Storm release](https://storm.incubator.apache.org/downloads.html) and make sure the storm binary is available on your PATH. Note that you *only* need to install a Storm release on your machine if you want to test with a simulated local cluster.

# Caveats

## Node modules and remote clusters

Your topology's node modules are installed before being packaged and submitted to the cluster. If you include node modules that build native code, this can cause problems if the machine submitting the topology is a different platform or architecture than the cluster nodes. In this case it is recommended you build and submit your topology from the same platform as your remote Storm cluster.

## Local cluster

The local cluster that ships with this module is not the same as the LocalCluster that ships with Storm. It actually starts a Zookeeper, a Nimbus, and a Supervisor on your machine, and submits your topology to the Nimbus instance. It tails all the Storm log files in order to give the illusion that all the servers are running in the same process. Watch out for cross-platform problems (I'm looking at you, Windows) and child processes that don't terminate, and please report any issues... or better yet, submit a pull request!

# Getting started

## Install the module

    npm install --save node-storm

## Require the module

    var storm = require('node-storm')

## Define a spout

    var myspout = storm.spout(function(sync) {
        // For an unreliable emit:
        this.emit([fieldValue1, fieldValue2])
    
        // For a reliable emit:
        this.emit([fieldValue1, fieldValue2], {id: 'some unique id'})
    
        // Tell storm we're done emitting tuples for now
        sync()
    })
    .declareOutputFields(["field1", "field2"]) // declare output fields
    .on('fail', function(data) {
        // Handle tuple failure
    })
    .on('ack', function(data) {
        // Handle tuple acknowledgement
    })

## Define a bolt

    var mybolt = storm.bolt(function(data) {
        // Emit some stuff
        this.emit([fieldValue1])
    
        // Anchoring
        this.emit([fieldValue1], {anchors: [data.id]})

        // Emit direct
        this.emit([fieldValue1], {stream: "streamid", task: 9})

        // Retrieving the task(s) a tuple was sent to
        this.emit([fieldValue1]).then(function(tasks) {
            // tasks is an array of task ids
        })

        // Log a message
        this.log('something interesting happened')
    
        // Acknowledge the tuple
        this.ack(data)

        // Or fail the tuple
        this.fail(data)
    })
    .declareOutputFields(["field1"])              // declare output fields
    .declareStream("streamid", false, ["field1"]) // optionally declare another output stream

# Build a topology

    var builder = storm.topologybuilder()
    builder.setSpout('spoutid', myspout)
    builder.setBolt('boltid', mybolt, 8).shuffleGrouping('spoutid')
    var topology = builder.createTopology()

# Submit the topology

    var options = {
        // name: 'optional... the default name is the name of the topology script',
        nimbus: 'host:port',
        config: { 'topology.debug': true }
    }
    storm.submit(topology, options, function(err, topologyName) {
        // Handle error or submission success
    })

# Running the examples

To run with a local cluster (see prerequisites):

    node examples/wordcount.js

To run with a remote cluster (see prerequisites):

    node examples/wordcount.js nimbushost[:nimbusport]
