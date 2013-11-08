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
var mouse = function(builder) {
    var initial = {x:0,y:0};
    var setup = function(trigger) {
        window.onmousemove = throttle(function(e){
            trigger({x:e.x,y:e.y})
        }, 50);
    }
    var mouseId = builder.input(initial,setup);
    return mouseId;
}

// clicks : Signal ()
var clicks = function(builder) {
    var unit = { _type : 'unit' };
    var setup = function(trigger) {
        window.onclick = function(e) {
            trigger(unit);
        };
    };
    var clicksId = builder.input(unit,setup);
    return clicksId;
};

// Ticks : Signal ()
var ticks = function(builder,n) {
    var unit = { _type : 'unit' };
    var setup = function(trigger) {
        var q = function() {
            trigger(unit);
            setTimeout(q,n);
        };
        setTimeout(q,n);
    };
    var ticksId = builder.input(unit,setup);
    return ticksId;
};

// print : Signal a -> Component
var print = function(builder,parentId) {
    var printOutput = builder.output(function(x) {
        console.log(x);
    }, parentId);
}

var show = function(builder,id,parentId) {
    var element = document.getElementById(id)
    var paragraphOutput = builder.output(function(v) {
        element.innerHTML = JSON.stringify(v);
    }, parentId);
}

// draw : Signal {a|x:Int,y:Int} -> Component
var draw = function(builder, id, parentId) {
    var canvas = document.getElementById(id)
    var ctx = canvas.getContext("2d");
    var drawOutput = builder.output(function(m) {
        ctx.save()
        ctx.setTransform(1,0,0,1,0,0)
        ctx.clearRect(0,0,canvas.width,canvas.height)
        ctx.restore()
        ctx.fillRect(0, 0, m.x, m.y)
    }, parentId);
}

