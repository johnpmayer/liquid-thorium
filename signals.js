
var m = mouse();
//print(m);
show('mouse',m);
draw("box",m);

var x = fmap('getX', 'record', m);
show('x',x);

var y = fmap('getY', 'record', m);
show('y',y);

var s0 = fmap('concat', 'a', x)
var s = app('b', s0, y);
//print(s);

var c = foldp('counter', '_', 'saved', 0, m);
show('count',c);

var label = constant('Count is => ');
var cc0 = fmap('concat', 'a', label);
var cc = app('b', cc0, c);
//print(cc);

var clicks = clicks();
var sample = sampleOn(clicks, s);
show('sample', sample);

startup(3);

