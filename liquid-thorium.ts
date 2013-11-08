
/// <reference path="underscore.d.ts" />

/*
 * This represents the scheduler and graphbuilder
 */ 

var IDLE    = 0
var WAITQ1  = 1
var WAITQ2  = 2
var RUNNING = 3
var MATCH1  = 4
var MATCH2  = 8

var guid7 = function() {
    return ((Math.random() * 0x10000000)|0).toString(16)
}

var startup = function(graph,n) {

    var nodes = graph.nodes;
    var inputs = graph.inputs;
    var readyNodeQ = [];
    var idleWorkerQ = [];

    function postWorker(worker,node) {
        var id = node.id;
        var fName = node.fThunk.name;
        var fEnv = node.fThunk.env;
        fEnv[node.argName] = node.fArg;
        worker.postMessage({
            id: id,
            fName: fName,
            fEnv: fEnv
        });
    }

    function startWorker(worker) {
        var id = readyNodeQ.shift();
        if (!id) {
            idleWorkerQ.push(worker);
            return;
        }
        var node = nodes[id];
        postWorker(worker,node);
    }

    function startNode(node) {
        var worker = idleWorkerQ.shift();
        if (!worker) {
            var id = node.id;
            readyNodeQ.push(id);
            return;
        }
        postWorker(worker,node);
    }

    function sendKids(node,updated,value) {
        var from = node.id;
        var kids = node.kids;
        _.each(kids, function(id) {
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
                sendKids(node,msg.updated,msg.value);
                break;
            case 'output':
                if (msg.updated) {
                    node.action(msg.value);
                }
                break;
            case 'lift':
                switch (node.state) {
                    case IDLE:
                        if (node.first || msg.updated) {
                            node.fArg = msg.value;
                        }
                        node.first = false;
                        if (msg.updated) {
                            startNode(node);
                        } else {
                            sendKids(node,false,undefined);
                        }
                        break;
                    case RUNNING:
                        node.argQ.push(msg);
                        break;
                }
                break;
            case 'foldp':
                if (node.first) {
                    node.first = false;
                    sendKids(node,true,node.hiddenstate);
                    break;
                }
                var foldEnv = {}
                foldEnv[node.argName] = msg.value;
                foldEnv[node.stateName] = node.hiddenstate;
                if (msg.updated) {
                    node.fThunk.env = foldEnv;
                    startNode(node);
                } else {
                    sendKids(node,false,undefined);
                }
                break;
            case 'app':
                var testState 
                    = node.fQ.length > 0
                    ? (node.argQ.length > 0 ? RUNNING : WAITQ2) 
                    : (node.argQ.length > 0 ? WAITQ1 : IDLE); 
                if (node.state !== testState) {
                    node.state = testState;
                }
                var sourceSignal 
                    = (msg.from === node.fId) ? MATCH1
                    : (msg.from === node.argId) ? MATCH2
                    : 0;
                switch (sourceSignal | node.state) {
                    case MATCH1 | IDLE:
                        node.state = WAITQ2;
                    case MATCH1 | WAITQ2: // no state change
                    case MATCH1 | RUNNING: // no state change
                        node.fQ.push(msg);
                        break;
                    case MATCH1 | WAITQ1:
                        var fMsg = msg;
                        var argMsg = node.argQ.shift();
                        var updated = fMsg.updated || argMsg.updated;
                        if (updated) {
                            node.state = RUNNING;
                            if (node.first || fMsg.updated) {
                                node.fThunk = fMsg.value;
                            }
                            if (node.first || argMsg.updated) {
                                node.fArg = argMsg.value;
                            }
                            node.first = false;
                            startNode(node);
                        } else {
                            sendKids(node,false,undefined);
                        }
                        break;
                    case MATCH2 | IDLE:
                        node.state = WAITQ1;
                    case MATCH2 | WAITQ1:
                    case MATCH2 | RUNNING:
                        node.argQ.push(msg);
                        break;
                    case MATCH2 | WAITQ2:
                        var fMsg = node.fQ.shift();
                        var argMsg = msg;
                        var updated = fMsg.updated || argMsg.updated;
                        if (updated) {
                            node.state = RUNNING;
                            if (node.first || fMsg.updated) {
                                node.fThunk = fMsg.value;
                            }
                            if (node.first || argMsg.updated) {
                                node.fArg = argMsg.value;
                            }
                            node.first = false;
                            startNode(node);
                        } else {
                            sendKids(node,false,undefined);
                        }
                        break;
                    default:
                        break;
                }
                break;
            case 'sampleOn':
                var sourceSignal 
                    = (msg.from === node.triggerId) ? MATCH1
                    : (msg.form === node.sampleId) ? MATCH2
                    : 0;
                switch (sourceSignal | node.state) {
                    case MATCH1 | IDLE:
                        node.state = WAITQ2;
                    case MATCH1 | WAITQ2: 
                        node.triggerQ.push(msg);
                        break;
                    case MATCH1 | WAITQ1:
                        var triggerMsg = msg;
                        var sampleMsg = node.sampleQ.shift();
                        var updated = triggerMsg.updated;
                        var value 
                            = !updated ? undefined 
                            : sampleMsg.updated ? sampleMsg.value 
                            : node.sampleLast;
                        sendKids(node,updated,value);
                        node.state 
                            = node.sampleQ.length > 0
                            ? WAITQ1
                            : IDLE;
                        break;
                    case MATCH2 | IDLE:
                        node.state = WAITQ1;
                    case MATCH2 | WAITQ1:
                        node.sampleQ.push(msg);
                        break;
                    case MATCH2 | WAITQ2:
                        var triggerMsg = node.triggerQ.shift();
                        var sampleMsg = msg;
                        var updated = triggerMsg.updated;
                        var value 
                            = !updated ? undefined 
                            : sampleMsg.updated ? sampleMsg.value 
                            : node.sampleLast;
                        sendKids(node,updated,value);
                        node.state 
                            = node.triggerQ.length > 0
                            ? WAITQ2
                            : IDLE;
                        break;
                    default:
                        break;
                }
                break;
            default:
                throw "Cannot schedule node type " + node.type + " not implemented";
                break;
        }
    }

    var triggerInput = function(targetId, value) {
        _.each(inputs, function(input) {
            var updated = (input.id === targetId);
            schedule({
                from: undefined,
                to: input.id,
                updated: updated,
                value: updated ? value : undefined
            });
        });
    };

    function reactorOutput(reactor, output) {
        var data = output.data;
        var id = data.id;
        var node = nodes[id];
        var kids = node.kids;
        var value = data.value;
        switch (node.type) {
            case 'lift':
                node.state = node.argQ.length > 0 ? RUNNING : IDLE;
                while (node.state === RUNNING) {
                    sendKids(node,true,value);
                    var argMsg = node.argQ.shift();
                    var updated = argMsg.updated;
                    if (updated) {
                        postWorker(reactor,node);
                        return;
                    } else {
                        sendKids(node,false,undefined);
                        node.state = node.argQ.length > 0 ? RUNNING : IDLE;
                    }
                }
                break;
            case 'foldp':
                node.hiddenstate = value;
                node.state = node.argQ.length > 0 ? RUNNING : IDLE;
                while (node.state === RUNNING) {
                    sendKids(node,true,value);
                    var argMsg = node.argQ.shift();
                    var updated = argMsg.updated;
                    if (updated) {
                        postWorker(reactor,node);
                        return;
                    } else {
                        sendKids(node,false,undefined);
                        node.state = node.argQ.length > 0 ? RUNNING : IDLE;
                    }
                }
                break;
            case 'app':
                node.state 
                    = node.fQ.length > 0
                    ? (node.argQ.length > 0 ? RUNNING : WAITQ2) 
                    : (node.argQ.length > 0 ? WAITQ1 : IDLE); 
                while (node.state === RUNNING) {
                    sendKids(node,true,value);
                    var fMsg = node.fQ.shift();
                    var argMsg = node.argQ.shift();
                    var updated = fMsg.updated || argMsg.updated;
                    if (updated) {
                        if (node.firstF || fMsg.updated) {
                            node.fThunk = fMsg.value;
                            node.firstF = false;
                        }
                        if (node.firstArg || argMsg.updated) {
                            node.fArg = argMsg.value;
                            node.firstArg = false;
                        }
                        postWorker(reactor,node);
                        return;
                    } else {
                        sendKids(node,false,undefined);
                        node.state 
                            = node.fQ.length > 0
                            ? (node.argQ.length > 0 ? RUNNING : WAITQ2) 
                            : (node.argQ.length > 0 ? WAITQ1 : IDLE); 
                    }
                    return;
                }
                break;
            default:
                break;
        }
        sendKids(node,true,value);
        startWorker(reactor);
    };

    _.each(inputs, function(input) {
        schedule({
            from: undefined,
            to: input.id,
            updated: true,
            value: input.initial,
        });
    });

    _.each(inputs, function(input) {
        var trigger = function(value) {
            triggerInput(input.id, value);
        };
        if (input.setup) {
            input.setup(trigger);
        }
    });

    // Start web workers and add them to the queue, taking work immediately
    _.each(_.range(n), function(i) {
        var reactor = new Worker('reactor.js');
        reactor.onmessage = function(output){reactorOutput(reactor,output);};
        startWorker(reactor);
    });
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
        var node = attrs || {};
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
        var id = baseNode('input', {});
        that.inputs.push({id:id,initial:initial,setup:setup});
        return id;
    };

    /*
     * Convenience wrapper
     */
    this.constant = function(initial) {
        return that.input(initial, undefined);
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
    this.lift = function(fName, argName, parentId) {
        // At this point it would prudent to check that argName is unique
        var id = baseNode('lift', {
            argName: argName,
            argQ: [],
            fThunk: {env: {}, name: fName},
            state: IDLE,
            first: true,
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
            argId: argId,
            argQ: [],
            state: IDLE,
            firstF: true,
            firstArg: true,
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
            state: IDLE,
        });
        link(triggerId, id);
        link(sampleId, id);
        return id;
    };

    this.foldp = function(fName, argName, stateName, initial, updateId) {
        var id = baseNode('foldp', {
            updateId: updateId,
            fThunk: {env: {}, name: fName},
            argName: argName,
            argQ: [],
            stateName: stateName,
            hiddenstate: initial,
            first: true,
            state: IDLE,
        });
        link(updateId, id);
        return id;
    };

    this.keepWhen = function(testId, sampleId) {

    };

    this.async = function(initial, sigId) {
        var magic = {callback: undefined};
        var setup = function(trigger) {
            // TODO is this a redundant closure
            magic.callback = function(value) {
                trigger(value);
            };
        };
        var asyncInId = that.input(initial, setup);
        var asyncOutId = that.output(function(x) {
            magic.callback(x);
        }, sigId);
        return asyncInId;
    };

    this.promise = function(action) {

    };

};
