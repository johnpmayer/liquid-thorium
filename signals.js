
var builder = new GraphBuilder();

var m = mouse(builder);
//print(m);
show(builder,'mouse',m);
draw(builder,'box',m);

var x = builder.lift('getX', 'record', m);
show(builder,'x',x);

var y = builder.lift('getY', 'record', m);
show(builder,'y',y);

var s0 = builder.lift('concat', 'a', x)
var s = builder.app('b', s0, y);
//print(s);

var c = builder.foldp('counter', '_', 'saved', 0, m);
show(builder,'count',c);

var label = builder.constant('Count is => ');
var cc0 = builder.lift('concat', 'a', label);
var cc = builder.app('b', cc0, c);
//print(cc);

var clicks = clicks(builder);
var sample = builder.sampleOn(clicks, s);
show(builder, 'sample', sample);

startup(builder.graph());

