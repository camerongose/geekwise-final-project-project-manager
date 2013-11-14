// author: Seth Thomas

define([
    'src/js/cruddylocalstorage',
    'src/js/cruddydb'
], function (Storage, DB) {

    function delay(fn, msDelay) {
        setTimeout(function () {
            fn();
        }, msDelay);
    }

    function wrapWithDelays(context, fn, msDelay) {
        return function () {
            var msDelayBefore;
            var msDelayAfter;

            if (typeof msDelay === 'function') {
                msDelayBefore = msDelay();
                msDelayAfter = msDelay();
            } else {
                msDelayBefore = msDelay;
                msDelayAfter = msDelay;
            }

            var args = Array.prototype.slice.call(arguments);
            var cb = args.splice(-1, 1)[0];

            delay(function () {
                var response = {};
                try {
                    var result = fn.apply(context, args);
                    response.success = true;
                    response.result = result;
                } catch (err) {
                    response.success = false;
                    response.error = err.message;
                }
                delay(function () {
                    cb(response);
                }, msDelayAfter);
            }, msDelayBefore);
        };
    }

    function AsyncDB(schema, namespace, delay) {
        // adds asynchronous delays to a CRUD database object
        // delay can be a number or a function that returns a number;
        //   the number represents the milliseconds delay before and after
        //   any database operation

        var db = new DB.CruddyDB(schema, new Storage(namespace));

        return {
            create: wrapWithDelays(db, db.create, delay),
            read: wrapWithDelays(db, db.read, delay),
            update: wrapWithDelays(db, db.update, delay),
            'delete': wrapWithDelays(db, db['delete'], delay)
        };
    }

    return AsyncDB;
});