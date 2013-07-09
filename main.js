
var m = mouse();
print(m);
draw("box",m);

var x = liftN('getX', [m]);
print(x);

var y = liftN('getY', [m]);
print(y);

var s = liftN('combine', [x,y]);
print(s);

startup(5);