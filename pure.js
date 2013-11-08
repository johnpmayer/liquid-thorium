
// getX : {a|x:Int} -> Int
function getX (env) {
    return env.record.x;
}

// getY : {a|y:Int} -> Int
function getY (env) {
    return env.record.y;
}

// stringy : a -> String
function stringy (env) {
    return JSON.stringify(env.stuff);
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

function combine (env) {
    return {
        name:'combine_1',
        env:{mouse:env.mouse}
    };
};

function combine_1 (env) {
    return {
        mouse: env.mouse,
        info: env.info
    };
};

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
    var n = Math.min(40,env.n);
    return "fib(" + n + ") = " + fibHelp(n) + " ";
}

