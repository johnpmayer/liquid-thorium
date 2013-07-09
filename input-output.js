// CREDIT : http://remysharp.com/2010/07/21/throttling-function-calls/
function throttle(fn, threshhold, scope) {
  threshhold || (threshhold = 250)
  var last
  var deferTimer
  return function () {
    var context = scope || this
    var now = +new Date
    var args = arguments
    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer)
      deferTimer = setTimeout(function () {
        last = now
        fn.apply(context, args)
      }, threshhold)
    } else {
      last = now
      fn.apply(context, args)
    }
  }
}

// mouse : Signal {x=Int,y=Int}
var mouse = function() {
    var initial = {x:0,y:0};
    var mouseId = input(initial);
    window.onmousemove = throttle(function(e){
       triggerInput(mouseId, {x:e.x,y:e.y})
    }, 50);
    return mouseId;
}

// print : Signal a -> Component
var print = function(parentId) {
    var printOutput = output(function(x) {
        console.log(x);
    }, parentId);
}

var draw = function(id, parentId) {
    
    var canvas = document.getElementById(id)
    var ctx = canvas.getContext("2d");
    var drawOutput = output(function(m) {
        ctx.save()
        ctx.setTransform(1,0,0,1,0,0)
        ctx.clearRect(0,0,canvas.width,canvas.height)
        ctx.restore()
        ctx.fillRect(0, 0, m.x, m.y)
    }, parentId);
}