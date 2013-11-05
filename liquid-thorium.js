
/*
 * This represents the scheduler and graphbuilder
 */ 

var IDLE        = 0
var WAIT_QUEUE1 = 1
var WAIT_QUEUE2 = 2
var RUNNING     = 3

var guid7 = function() {
    return ((Math.random() * 0x10000000)|0).toString(16)
}

var startup = function(graph,n) {
    
    var nodes = graph.nodes;
    var inputs = graph.inputs;
    var readyNodeQ = [];
    var idleWorkerQ = [];

    function startWorker(worker,node) {
        var id = node.id;
        var fName = node.fThunk.name;
        var fEnv = fThunk.env;
        fEnv[node.argname] = node.fArg;
        worker.postMessage({
            id: id,
            fName: fName,
            fEnv: fEnv
        });
    }

    function scheduleWorker(worker) {
        var id = readyNodeQ.shift();
        if (!nodeid) {
            idleWorkerQ.push(worker);
            return;
        }
        var node = nodes[id];
        startWorker(worker,node);
    }

    function scheduleNode(node) {
        var worker = idleWorkerQ.shift();
        if (!worker) {
            var id = node.id;
            readyNodeQ.push(id);
            return;
        }
        startWorker(worker,node);
    }

    function sendkids(from,updated,value,kids) {
        _.each(inputs, function(id) {
            schedule({
                from: from,
                to: id,
                updated: updated,
                value: value
            });
        });
    }

    function schedule(msg) {
        var id = msg.to;
        var node = nodes[id];
        switch (node.type) {
            case 'input':
                sendKids(id,msg.updated,msg.value,node.kids);
                break;
            case 'output':
                if (msg.updated) {
                    node.action(msg.value);
                }
                break;
            case 'lift':
                // send to worker
                break;
            case 'app':
                // add queues, check
                // // send to worker
            case 'sampleOn':
                // add queues, check
                // // send to worker
            default:
                break;
        }
    }

    var triggerInput = function(targetId, value) {
        _.each(inputs, function(id) {
            var updated = (id === targetId);
            schedule({
                from: undefined,
                to: id,
                updated: updated,
                value: updated ? value : undefined
            });
        });
    };

    _.each(inputs, function(input) {
        var trigger = function(value) {
            triggerInput(input.id, value);
        };
        input.setup(trigger);
    });

    _.each(nodes, function(node,id) {
        // Not sure what goes on here
        var foo = null
    });

    function reactorOutput(reactor, output) {
        var id = output.id;
        var kids = nodes[id].kids;
        var value = output.value;
        sendkids(id,true,value,kids);
        workerAvailable(reactor);
    };

    // Start web workers and add them to the queue, taking work immediately
    _.each(_.range(n), function(i) {
        var reactor = new Worker('reactor.js');
        reactor.onmessage = function(output){reactorOutput(reactor,output);};
        workerAvailable(reactor);
    });

    return triggerInput;
}

function GraphBuilder() {

    var that = this;

    this.nodes = {};
    this.inputs = [];

    /*
     * This is all you get!
     */
    this.graph = function() {
        return {
            nodes: that.nodes,
            inputs: that.inputs
        };
    };

    /*
     * Add boilerplate to the provided config and add the created node
     * to the signal graph that we're building
     */
    var baseNode = function(type, attrs) {
        node = attrs || {};
        var id = guid7();
        node.id = id;
        node.type = type;
        node.kids = [];
        that.nodes[id] = node;
        return id;
    };

    /*
     * Push the id of the child onto the children of the parent
     */
    var link = function(parentId, childId) {
        that.nodes[parentId].kids.push(childId);
    }

    /*
     * Exposed graph builder API for adding new types of nodes
     */

    /*
     * The id for input should also be used as the async input address
     */
    this.input = function(initial, setup) {
        var id = baseNode('input');
        that.inputs.push({id:id,initial:initial,setup:setup});
        return id;
    };

    /*
     * Convenience wrapper
     */
    this.constant = function(initial) {
        return that.input(initial);
    };

    /*
     * Attach a callback to be executed on signal updates
     */
    this.output = function(action, parentId) {
        var id = baseNode('output', {
            action: action
        });
        link(parentId, id);
    }

    /*
     * Apply a known function to a signal of arguments
     */
    this.lift = function(argName, fName, parentId) {
        // At this point it would prudent to check that argName is unique
        var id = baseNode('lift', {
            argName: argName,
            fName: fName
        });
        link(parentId, id);
        return id;
    };

    /*
     * Apply a signal of functions to a signal of arguments
     */
    this.app = function(argName, fId, argId) {
        var id = baseNode('app', {
            argName: argName,
            fId: fId,
            fQ: [],
            fLast: null,
            argId: argId,
            argQ: [],
            argLast: null
        });
        link(fId, id);
        link(argId, id);
        return id;
    };

    /*
     * Fire an update of the most recent sample on trigger updates
     */
    this.sampleOn = function(triggerId, sampleId) {
        var id = baseNode('sampleOn', {
            triggerId: triggerId,
            triggerQ: [],
            sampleId: sampleId,
            sampleQ: [],
            sampleLast: null,
        });
        link(triggerId, id);
        link(sampleId, id);
        return id;
    };

    this.foldp = function(fName, argName, stateName, initial, updateId) {
        var id = baseNode('foldp', {
            updateId: updateId,
            fName: fName,
            argName: argName,
            stateName: stateName,
            initial: initial
        });
        link(updateId, id);
        return id;
    };
    // foldp TODO
    
    // promise? TODO

};
