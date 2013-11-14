// author: Seth Thomas

define(function () {
    function ErrorClassFactory(errorName) {
        // creates error classes

        var fn = function (message) {
            this.message = message;
        };
        fn.prototype = new Error();
        fn.prototype.constructor = fn;
        fn.prototype.name = errorName;

        return fn;
    }

    function forEach(obj, fn) {
        // execute fn for each k/v in the object
        // break execution if false is returned
        var result;
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                result = fn(k, obj[k]);
                if (result === false) {
                    break;
                }
            }
        }
    }

    function isUndefinedOrNull(value) {
        return value === undefined || value === null;
    }

    return {
        ErrorClassFactory: ErrorClassFactory,
        forEach: forEach,
        isUndefinedOrNull: isUndefinedOrNull
    };
});