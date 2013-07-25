
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

var applyThunk = function (argName, thunk, arg) {
    //throw new Error(JSON.stringify(thunk));
    var env = thunk.env;
    env[argName] = arg;
    var f = self[thunk.fName];
    return f(env);
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
    
    case 'fmap':
        var f = self[node.fName];
        var env = {}
        env[node.argName] = msg.value;
        var value =  msg.changed ? f(env) : undefined;
        postKids(node, msg.changed, value);
        postDone(node);
        break;

    case 'sampleOn':
        var fromQ = node.queues[msg.from];
        fromQ.push(msg);
        var waiting = _.some(node.queues, function(queue) {
            return (queue.length === 0);
        });
        if (!waiting) {
            var triggerMsg = node.queues[node.triggerId].shift();
            var sampleMsg = node.queues[node.sampleId].shift();
            var changed = triggerMsg.changed;
            if (sampleMsg.changed) {
                node.lastSample = sampleMsg.value;
            }
            value = changed ? node.lastSample : undefined;
            postKids(node, changed, value); 
        }
        postDone(node);
        break;

    case 'app':
        var fromQ = node.queues[msg.from];
        fromQ.push(msg);
        var waiting = _.some(node.queues, function(queue) {
            return (queue.length === 0);
        });
        if (!waiting) {
            var thunkMsg = node.queues[node.fId].shift();
            var argMsg = node.queues[node.argId].shift();
            var changed = thunkMsg.changed || argMsg.changed;
            var value = undefined;
            if (changed) {
                var thunk = thunkMsg.changed ? thunkMsg.value : node.lastVals[node.fId];
                node.lastVals[node.fId] = thunk;
                var arg = argMsg.changed ? argMsg.value : node.lastVals[node.argId];
                node.lastVals[node.argId] = arg;
                value = applyThunk(node.argName,thunk,arg);
            }
            postKids(node, changed, value); 
        }
        postDone(node);
        break;

    case 'foldp':
        if (node.first) {
            postKids(node,true,node.saved);
            node.first = false;
            postDone(node);
            break;
        }
        var f = self[node.stepFName];
        var changed = msg.changed;
        var value = undefined;
        if (changed) {
            var env = {};
            env[node.triggerArgName] = msg.value;
            env[node.savedArgName] = node.saved;
            var value = f(env);
            node.saved = value;
        }
        postKids(node,changed,value);
        postDone(node);
        break;

    /*
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
    */

    default:
        break;

    }
    
};
