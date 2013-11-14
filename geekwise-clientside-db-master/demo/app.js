require([
    'src/js/asyncdb',
    'src/js/randoms'
], function (DB, Randoms) {
    var schema = {
        users: {
            firstName: 'string:min[1]:max[20]',
            lastName: 'string:max[20]',
            nickName: 'string:max[20]',
            email: 'string'
        },
        messages: {
            msg: 'string',
            who: 'ref=users',
            when: 'string'
        },
        conversations: {
            messages: 'array:ref=messages'
        },
        projects: {
            title: 'string',
            description: 'string',
            team: 'array:ref=users',
            status: 'string',
            conversation: 'ref=conversations'
        }
    };

    // a database instance takes 3 arguments
    // schema - this schema should be sufficient to meet the needs of a project status board,
    //     though you could easily extend it to provide other fields and tables
    // namespace - this string will be prepended to each key in the localstorage lookup; use a
    //     different namespace per database object, so that you don't collide
    // delay - time in ms to delay on both legs of the request; simulates the latency of sending
    //     a request to a server; can be either a number or a function that returns a number
    var db = DB(schema, 'demo.geekwise', function () {
        // random delays from 25-200 ms each direction
        // so total latency will be from 50-400 ms
        return Randoms.getInt(25, 200);
    });

    // a simple request queue; throttles requests so that only one goes at a time; new requests
    // will be queued up in the order that they are made; the next request will execute when the
    // previous request is finished; if empty, the new request will immediately execute
    var query = (function () {
        var queue = [];
        var running = false;

        function execute() {
            if (queue.length === 0) {
                running = false;
                return;
            }

            function callback(res) {
                console.log('==============');
                console.log(args);
                console.log(res);
                console.log('latency: ' + (Date.now() - start) + 'ms');
                execute();
            }

            running = true;
            var start = Date.now();
            var args = queue.splice(0, 1)[0];
            var operation = args[0];
            var key = args[1];
            var value = args[2];

            if (value !== undefined) {
                db[operation](key, value, callback);
            } else {
                db[operation](key, callback);
            }
        }

        return function query(operation, key, value) {
            queue.push([operation, key, value]);

            if (!running) {
                execute();
            }
        };
    })();

    // clear the entire database
    query('delete', '*');

    // create single row
    /*query('create', 'users', {
        firstName: 'Bob',
        lastName: 'Builder',
        nickName: 'PlanetBob',
        email: 'bob@test.com'
    });

    // create multiple rows
    query('create', 'users', {
        firstName: 'John',
        lastName: 'Doe',
        nickName: 'Who?',
        email: 'whoami@test.com',
        id: 'x007x' // we are explicitly setting the ID
    }, {
        firstName: 'Betty',
        lastName: 'Sue',
        nickName: 'BS',
        email: 'bs@test.com'
    });

    // read all rows from some tables
    query('read', 'projects/*');
    query('read', 'users/*');

    // update a row
    query('update', 'users/x007x', {
        firstName: 'John',
        lastName: 'Doe',
        nickName: 'JD', // new nickname
        email: 'whoami@test.com'
    });

    // verify the update was save to the database
    query('read', 'users/x007x');

    // remove a row
    query('delete', 'users/x007x');
    */
});