
// All of the nodes
var contexts = {}
// Node ids of inputs
var inputs = []
// Node ids with work and not running
var readyNodeQ = []
// Workers not doing anything
var idleWorkerQ = []

// False during setup
var started = false

var guid7 = function() {
    return ((Math.random() * 0x10000000)|0).toString(16)
}

var triggerInput = function(target, value) {
    _.each(inputs, function(id) {
        var changed = id === target;
        schedule({
            from: undefined,
            to: id,
            changed: changed,
            value: changed ? value : undefined
        });
    });
}

var link = function(parentId, childId) {
    if (started) {
        throw new Error('Containment breach');
    }
    contexts[parentId].node.kids.push(childId);
}

var schedule  = function(msg) {
    var nodeId = msg.to;
    var ctx = contexts[nodeId];
    if (ctx.node.type === 'output') {
        // blocks the scheduler for I/O
        ctx.node.action(msg.value);
    } else {
        var inbox = ctx.inbox;
        if (ctx.state === 'idle' && inbox.length === 0) {
            readyNodeQ.push(nodeId);   
        }
        ctx.inbox.push(msg);
    }
    if(started) {
        var worker = idleWorkerQ.shift();
        if (worker) {
            workerAvailable(worker);
        }
    }
}

var workerAvailable = function(worker) {
    var nodeId = readyNodeQ.shift();
    if (!nodeId) {
        idleWorkerQ.push(worker);
        return;
    }
    var ctx = contexts[nodeId];
    ctx.state = 'running';
    worker.postMessage({
        node: ctx.node,
        msg: ctx.inbox.shift()
    });
}

var startup = function(n) {
    started = true;
    _.each(_.range(n), function(i) {
        var reactor = new Worker('reactor.js');
        reactor.onmessage = function(output) {
            switch (output.data.type) {
            case 'msg':
                var message = output.data.message;
                schedule(message);
                break;
            case 'done':
                var node = output.data.node;
                var ctx = contexts[node.id];
                ctx.node = node;
                ctx.state = 'idle';
                if (ctx.inbox.length > 0) {
                    readyNodeQ.push(node.id);
                }
                workerAvailable(reactor);
                break;
            default:
                break;
            }
        };
        workerAvailable(reactor);
    });
}

var basicNode = function(type, attrs) {
    if (started) {
        throw new Error('Containment breach');
    }
    var id = guid7();
    node = attrs || {};
    node.type = type;
    node.id = id;
    node.kids = [];
    contexts[id] = {
        state: 'idle',
        inbox: [],
        node: node
    };
    return id;
}

var input = function(initial) {
    var id = basicNode('input');
    inputs.push(id);
    schedule({
        from: undefined,
        to: id,
        changed: true,
        value: initial
    });
    return id;
};

var constant = function(initial) { return input(initial); };

var output = function(action, parentId) {
    var id = basicNode('output', {action: action});
    link(parentId, id);
    return id;
};

var fmap = function(fName, argName, parentId) {
    var id = basicNode('fmap', {
        fName: fName,
        argName: argName
    });
    link(parentId, id);
    return id;
};

var app = function(argName, fId, argId) {
    
    var queues = {};
    var lastVals = {};
    _.each([fId,argId], function(parentId) {
        queues[parentId] = [];
        lastVals[parentId] = undefined;
    });
    
    var id = basicNode('app', {
        argName:argName,
        fId:fId,
        argId:argId,
        queues: queues,
        lastVals: lastVals
    });
    
    _.each([fId,argId], function(parentId) {
        link(parentId, id);
    });

    return id;

};

var foldp = function(stepFName, triggerArgName, savedArgName, initial, triggerId) {
    
    var id = basicNode('foldp', {
        stepFName:stepFName,
        triggerArgName:triggerArgName,
        savedArgName:savedArgName,
        saved:initial,
        first:true
    });

    link(triggerId, id);

    return id;
}

/*
var liftN = function(fName, parentIds) {

    var queues = {};
    var lastVals = {};
    _.each(parentIds, function(parentId) { 
        queues[parentId] = [];
        lastVals[parentId] = undefined;
    });
     
    var id = basicNode('liftN', {
        fName: fName, 
        parentIds: parentIds, 
        queues: queues,
        lastVals: lastVals
    });
    _.each(parentIds, function(parentId) {
        link(parentId, id);
    });
    return id;
}
*/
