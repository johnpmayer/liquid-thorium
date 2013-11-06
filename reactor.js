
importScripts('underscore.js');
importScripts('pure.js');

function yieldEvaluated (id, value) {

self.onmessage = function (msg) {

    var data = msg.data;
    var id = data.id;
    var fName = data.fName;
    var fEnv = data.fEnv;

    var f = self[fName];

    var value = f(fEnv);

    yieldEvaluated(id,value);

};
