
// getX : {a|x:Int} -> Int
function getX (env) {
    return env.record.x;
}

// getY ; {a|y:Int} -> Int
function getY (env) {
    return env.record.y;
}

/*
 * combine : Int -> Int -> String
 */

// combine_0 : Int -> Thunk (Int |> Int -> String)
function concat (env) {
    return {
        name:'concat_1',
        env:{a:env.a}
    };
};

// combine_1 : Int |> Int -> String
function concat_1 (env) {
    return env.a + "" + env.b;
}

// counter : (a,Int) -> Int
function counter (env) {
    // ignore env.trigger
    return env.saved + 1;
}

function fib (env) {
    var fibHelp = function(n) {
        if (n === 0 || n === 1) {
            return 1;
        } else {
            return fibHelp(n-1) + fibHelp(n-2);
        }
    }
    return fibHelp(env.n) + " "
}

