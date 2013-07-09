importScripts('underscore.js');
importScripts('pure.js');

var postKids = function(node, changed, value) {
    _.each(node.kids, function(kidId) {
        postMessage({
            type: 'msg', 
            message: {
                to: kidId,
                from: node.id,
                changed: changed,
                value: changed ? value : undefined
            }
        });
    });
};

var postDone = function(node) {
    postMessage({
        type: 'done',
        node: node
    });
};

self.onmessage = function (input) {
    
    var node = input.data.node;
    var msg = input.data.msg;
    
    switch(node.type) {

    case 'input':
        postKids(node, msg.changed, msg.value);
        postDone(node);
        break;

    case 'output':
        throw new Error('Containment breach');
        break;

    case 'liftN':
        var fromQ = node.queues[msg.from];
        fromQ.push(msg);
        var waiting = _.some(node.queues, function(queue) {
            return (queue.length === 0);
        });
        if (!waiting) {
            var f = self[node.fName];
            var anyChanged = false;
            var posArgs = _.map(node.parentIds, function(parentId) {
                var qMsg = node.queues[parentId].shift();
                // pretending in an each
                anyChanged = anyChanged || qMsg.changed;
                var arg = qMsg.changed ? qMsg.value : node.lastVals[parentId];
                if (arg === undefined || arg === null) {
                    throw new Error(JSON.stringify(input.data) + ',' + JSON.stringify(parentId) + ',' + JSON.stringify(qMsg));
                }
                return arg;
            })
            var output = anyChanged ? f.apply(this,posArgs) : undefined;
            postKids(node, anyChanged, output);
        }
        // TODO tryKeepRunning
        postDone(node);
        break;

    default:
        break;

    }
    
};