
importScripts('underscore.js');
importScripts('pure.js');

self.onmessage = function (msg) {

    var data = msg.data;
    var id = data.id;
    var fName = data.fName;
    var fEnv = data.fEnv;

    var f = self[fName];

    if (!f) throw "Couldn't find function " + fName;

    var value = f(fEnv);

    postMessage({
        id: id,
        value: value
    });

};
