
var builder = new GraphBuilder();

var m = mouse(builder);
var t = ticks(builder,1000);
var n = 30;
var clock = builder.foldp('counter', '_', 'saved', n, t);
//var fibclock = builder.lift('fib', 'n', clock);
var fibclock = builder.async("",builder.lift('fib', 'n', clock));
var fb0 = builder.lift('concat', 'a', clock);
var fb = builder.app('b', fb0, fibclock);

var scene0 = builder.lift('combine', 'mouse', m);
var scene = builder.app('info', scene0, fb);

draw(builder, 'box', 'fibclock', scene);

var graph = builder.graph();
startup(graph,4);

