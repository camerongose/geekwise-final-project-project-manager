define([
    'src/js/utils',
    'src/js/cruddylocalstorage',
    'src/js/schema',
    'src/js/cruddydb'
], function (Utils, Storage, Schema, CruddyDB) {
    QUnit.start();

    var NAMESPACE = 'cruddy';
    var forEach = Utils.forEach;
    var E = CruddyDB.exceptions;
    var DB = CruddyDB.CruddyDB;
    var SE = Schema.exceptions;
    var temporals = {};

    function stubMathRandom() {
        // stub out Math.random() so that it always
        // returns 0; makes "random" results predictable

        sinon.stub(Math, 'random', function () {
            return 0;
        });
    }

    function cleanupLocalStorage() {
        // remove all keys that start with NAMESPACE from the localstorage
        var regex = new RegExp('^' + NAMESPACE);
        forEach(window.localStorage, function (k) {
            if (regex.test(k)) {
                window.localStorage.removeItem(k);
            }
        });
    }

    function cleanupTemporals() {
        temporals = {};
    }

    function generalCleanup() {
        // just some things it would generally be a good idea to make
        // sure are cleaned up
        cleanupLocalStorage();
        cleanupTemporals();
        if (Math.random.restore) {
            Math.random.restore();
        }
    }

    function setupStorage() {
        temporals.storage = new Storage(NAMESPACE);
    }

    function setupSchema() {
        temporals.schema = {
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
    }

    function generalSetup() {
        setupSchema();
        setupStorage();
        temporals.db = new DB(temporals.schema, temporals.storage);
    }

    function prepopulateDB() {
        // pre-populate the db
        var db = temporals.db;
        var pp = temporals.prepopulated = {
            users: {},
            projects: {},
            messages: {},
            conversations: {}
        };
        pp.users.bob = db.create('users', {
            firstName: 'Bob',
            lastName: 'Builder',
            nickName: 'PlanetBob',
            email: 'bob@test.com'
        })[0];
        pp.users.john = db.create('users', {
            firstName: 'John',
            lastName: 'Doe',
            nickName: 'Who?',
            email: 'whoami@test.com'
        })[0];
        pp.users.betty = db.create('users', {
            firstName: 'Betty',
            lastName: 'Sue',
            nickName: 'BS',
            email: 'bs@test.com'
        })[0];
        pp.conversations.dbAPI = db.create('conversations', {messages: []})[0];
        pp.projects.dbAPI = db.create('projects', {
            title: 'Database API',
            description: 'need to talk to the data storage layer',
            team: [pp.users.bob.id, pp.users.betty.id],
            status: 'ontrack',
            conversation: pp.conversations.dbAPI.id
        })[0];
        pp.messages.frontend1 = db.create('messages', {
            msg: 'kickoff meeting',
            who: pp.users.bob.id,
            when: '07/01/13 12:00:00'
        })[0];
        pp.messages.frontend2 = db.create('messages', {
            msg: 'boom!',
            who: pp.users.john.id,
            when: '07/04/13 17:30:00'
        })[0];
        pp.conversations.frontend = db.create('conversations', {messages: [pp.messages.frontend1.id, pp.messages.frontend2.id]})[0];
        pp.projects.frontend = db.create('projects', {
            title: 'Web Front-end',
            description: 'need a web accessible front-end',
            team: [pp.users.bob.id, pp.users.john.id],
            status: 'offtrack',
            conversation: pp.conversations.frontend.id
        })[0];
    }

    QUnit.module('constructor', {
        setup: function () {
            setupStorage();
            setupSchema();
        },
        teardown: generalCleanup
    });

    QUnit.test('constructor(schema, storage)', function () {
        QUnit.ok(new DB(temporals.schema, temporals.storage) instanceof DB, 'successfully created');
    });

    QUnit.test('constructor(schema, storage) where required arguments are missing', function () {
        QUnit.throws(function () {
            var db = new DB();
        }, E.ArgsError, 'schema and storage are missing');

        QUnit.throws(function () {
            var db = new DB(temporals.schema);
        }, E.ArgsError, 'storage is missing');

        QUnit.throws(function () {
            var db = new DB(undefined, temporals.storage);
        }, E.ArgsError, 'schema is missing');
    });

    QUnit.test('constructor(storage, schema) where storage does not provide a CRUD interface', function () {
        QUnit.throws(function () {
            var db = new DB(temporals.schema, {});
        }, E.ArgsError, 'storage must support a CRUD interface');
    });

    QUnit.test('constructor(storage, schema) where schema is invalid', function () {
        QUnit.throws(function () {
            temporals.schema.users.foo = 'bar';
            var db = new DB(temporals.schema, temporals.storage);
        }, SE.ArgsError, 'schema must be valid');
    });

    QUnit.module('create', {
        setup: function () {
            generalSetup();
            stubMathRandom();
        },
        teardown: generalCleanup
    });

    QUnit.test('create(key, value)', function () {
        QUnit.deepEqual(temporals.db.create('users', {
            firstName: 'Bob',
            lastName: 'Builder',
            nickName: 'PlanetBob',
            email: 'bob@test.com'
        }), [
            {
                firstName: 'Bob',
                    lastName: 'Builder',
                nickName: 'PlanetBob',
                email: 'bob@test.com',
                id: '00000'
            }
        ], 'returns the fixed up value on successful creation');
    });

    QUnit.test('create(key, value) where value is an array of values', function () {
        QUnit.deepEqual(temporals.db.create('users/*', [
            {
                firstName: 'Bob',
                lastName: 'Builder',
                nickName: 'PlanetBob',
                email: 'bob@test.com'
            }, {
                firstName: 'John',
                lastName: 'Doe',
                nickName: 'Who?',
                email: 'whoami@test.com',
                id: '00001'
            }, {
                firstName: 'Betty',
                lastName: 'Sue',
                nickName: 'BS',
                email: 'bs@test.com',
                id: '00002'
            }
        ]), [
            {
                firstName: 'Bob',
                lastName: 'Builder',
                nickName: 'PlanetBob',
                email: 'bob@test.com',
                id: '00000'
            },
            {
                firstName: 'John',
                lastName: 'Doe',
                nickName: 'Who?',
                email: 'whoami@test.com',
                id: '00001'
            },
            {
                firstName: 'Betty',
                lastName: 'Sue',
                nickName: 'BS',
                email: 'bs@test.com',
                id: '00002'
            }
        ], 'returns the fixed up values on successful creation');
    });

    QUnit.test('create(key, value) where required arguments are missing', function () {
        QUnit.throws(function () {
            temporals.db.create();
        }, SE.ArgsError, 'key and value are missing');

        QUnit.throws(function () {
            temporals.db.create('users');
        }, SE.ArgsError, 'value is missing');

        QUnit.throws(function () {
            temporals.db.create(undefined, {});
        }, SE.ArgsError, 'key is missing');
    });

    QUnit.test('create(key, value) where key is unrecognized table', function () {
        QUnit.throws(function () {
            temporals.db.create('foo', {});
        }, SE.ArgsError, 'key is unrecognized table');
    });

    QUnit.test('create(key, value) where value is invalid', function () {
        QUnit.throws(function () {
            temporals.db.create('users', {
                firstName: 'Bob',
                lastName: 'Builder',
                nickName: 'PlanetBob',
                email: 'bob@test.com',
                foo: 'bar'
            });
        }, SE.ArgsError, 'value is invalid');
    });

    QUnit.test('create(key, value) where row already exists', function () {
        QUnit.throws(function () {
            var row = temporals.db.create('users', {
                firstName: 'Bob',
                lastName: 'Builder',
                nickName: 'PlanetBob',
                email: 'bob@test.com'
            });

            temporals.db.create('users', {
                firstName: 'John',
                lastName: 'Doe',
                nickName: 'Who?',
                email: 'whoami@test.com',
                id: row['users/00000'].id // collide with the first row
            });
        }, Error, 'row already exists');
    });

    QUnit.module('read', {
        setup: function () {
            generalSetup();
            prepopulateDB();
        },
        teardown: generalCleanup
    });

    QUnit.test('read(key) where key is a table/id', function () {
        var bob = temporals.prepopulated.users.bob;
        var expected = {};
        expected['users/' + bob.id] = bob;
        QUnit.deepEqual(temporals.db.read('users/' + bob.id), expected, 'returned expected rows');
    });

    QUnit.test('read(key) where key is a table/wildcard', function () {
        var expected = {};
        forEach(temporals.prepopulated.users, function (_, user) {
            expected['users/' + user.id] = user;
        });

        QUnit.deepEqual(temporals.db.read('users/*'), expected, 'returned expected rows');
    });

    QUnit.test('read(key) where key is a wildcard', function () {
        var expected = {};
        forEach(temporals.prepopulated, function (tableName, rows) {
            forEach(rows, function (_, row) {
                expected[tableName + '/' + row.id] = row;
            });
        });

        QUnit.deepEqual(temporals.db.read('*'), expected, 'returned expected rows');
    });

    QUnit.test('read(key) where key is a table/id1,id2', function () {
        var pp = temporals.prepopulated;
        var bob = pp.users.bob;
        var john = pp.users.john;
        var betty = pp.users.betty;
        var expected = {};
        expected['users/' + bob.id] = bob;
        expected['users/' + john.id] = john;
        expected['users/' + betty.id] = betty;

        QUnit.deepEqual(temporals.db.read('users/' + [bob.id, john.id, betty.id].join(',')), expected, 'returned expected rows');
    });

    QUnit.test('read(key) where key does not exist', function () {
        QUnit.deepEqual(temporals.db.read('users/does-not-exist'), {}, 'matching row does not exist');
    });

    QUnit.test('read(key) where required arguments are missing', function () {
        QUnit.throws(function () {
            temporals.db.read();
        }, E.ArgsError, 'key is missing');
    });

    QUnit.test('read(key) where key is not a string', function () {
        QUnit.throws(function () {
            temporals.db.read({key: 'users/*'});
        }, E.ArgsError, 'key must be a string');
    });

    QUnit.module('update', {
        setup: function () {
            generalSetup();
            prepopulateDB();
        },
        teardown: generalCleanup
    });

    QUnit.test('update(key, value) where key is a "table/id"', function () {
        var pp = temporals.prepopulated;
        var newBob = pp.users.bob;
        newBob.nickName = 'Sledge Hammer';

        QUnit.deepEqual(temporals.db.update('users/' + newBob.id, newBob), newBob, 'successfully updated row');
        var expected = {};
        expected['users/'+ newBob.id] = newBob;
        QUnit.deepEqual(temporals.db.read('users/' + newBob.id), expected, 'confirmed that update was saved');
    });

    QUnit.test('update(key, value) where key is a "table/*"', function () {
        var pp = temporals.prepopulated;
        var newBob = pp.users.bob;
        newBob.nickName = 'Sledge Hammer';
        var newJohn = pp.users.john;
        newJohn.nickName = "What's my name again";

        QUnit.deepEqual(temporals.db.update('users/*', [newBob, newJohn]), [newBob, newJohn], 'successfully updated rows');
        var expected = {};
        expected['users/' + newBob.id] = newBob;
        expected['users/' + newJohn.id] = newJohn;
        QUnit.deepEqual(temporals.db.read('users/' + newBob.id + ',' + newJohn.id), expected, 'confirmed that updates were saved');
    });

    QUnit.test('update(key, value) where required arguments are missing', function () {
        QUnit.throws(function () {
            temporals.db.update();
        }, E.ArgsError, 'key and value are missing');

        QUnit.throws(function () {
            temporals.db.update('users/00000');
        }, E.ArgsError, 'value is missing');

        QUnit.throws(function () {
            temporals.db.update(undefined, {});
        }, E.ArgsError, 'key is missing');
    });

    QUnit.test('update(key, value) where key does not match a row', function () {
        var pp = temporals.prepopulated;
        var newBob = pp.users.bob;
        newBob.nickName = 'Sledge Hammer';
        newBob.id = 'does-not-exist';

        QUnit.throws(function () {
            temporals.db.update('users/' + newBob.id, newBob);
        }, Error, 'no matching row');
    });

    QUnit.test('update(key, value) where key contains a wildcard', function () {
        var pp = temporals.prepopulated;
        var newBob = pp.users.bob;
        newBob.nickName = 'Sledge Hammer';

        QUnit.throws(function () {
            temporals.db.update('users/*', newBob);
        }, Error, 'key may not have a wildcard');

        QUnit.throws(function () {
            temporals.db.update('*/' + newBob.id, newBob);
        }, Error, 'key may not have a wildcard');
    });

    QUnit.test('update(key, value) where value is invalid', function () {
        var pp = temporals.prepopulated;
        var newBob = pp.users.bob;
        newBob.nickName = 'Sledge Hammer';
        newBob.foo = 'bar';

        QUnit.throws(function () {
            temporals.db.update('users/' + newBob.id, newBob);
        }, Error, 'value was invalid');
    });

    QUnit.test('update(key, value) where key "id" does not match value "id"', function () {
        var pp = temporals.prepopulated;
        var newBob = pp.users.bob;
        newBob.nickName = 'Sledge Hammer';
        var originalId = newBob.id;
        newBob.id = 'does-not-match';

        QUnit.throws(function () {
            temporals.db.update('users/' + originalId, newBob);
        }, E.ArgsError, 'key "id" must match value "id"');
    });

    QUnit.module('delete', {
        setup: function () {
            generalSetup();
            prepopulateDB();
        },
        teardown: generalCleanup
    });

    QUnit.test('delete(key) where key is table/id', function () {
        var db = temporals.db;
        var pp = temporals.prepopulated;
        var bob = pp.users.bob;

        db['delete']('users/' + bob.id);
        var expected = {};
        forEach(pp.users, function (_, user) {
            if (user !== bob) {
                expected['users/' + user.id] = user;
            }
        });
        QUnit.deepEqual(db.read('users/*'), expected, 'the specified row was removed');
    });

    QUnit.test('delete(key) where key is table/id1,id2', function () {
        var db = temporals.db;
        var pp = temporals.prepopulated;
        var bob = pp.users.bob;
        var betty = pp.users.betty;

        db['delete']('users/' + [bob.id, betty.id].join(','));
        var expected = {};
        forEach(pp.users, function (_, user) {
            if (user !== bob && user !== betty) {
                expected['users/' + user.id] = user;
            }
        });
        QUnit.deepEqual(db.read('users/*'), expected, 'the specified rows were removed');
    });

    QUnit.test('delete(key) where key is table/wildcard', function () {
        var db = temporals.db;
        var projects = db.read('projects/*');

        db['delete']('users/*');
        QUnit.deepEqual(db.read('users/*'), {}, 'all users are removed');
        QUnit.deepEqual(db.read('projects/*'), projects, 'no projects were removed');
    });

    QUnit.test('delete(key) where key is wildcard', function () {
        var db = temporals.db;

        // remove everything
        db['delete']('*');
        QUnit.deepEqual(db.read('users/*'), {}, 'all users are removed');
        QUnit.deepEqual(db.read('projects/*'), {}, 'all projects are removed');
        QUnit.deepEqual(db.read('conversations/*'), {}, 'all conversations are removed');
        QUnit.deepEqual(db.read('messages/*'), {}, 'all messages are removed');
    });

    QUnit.test('delete(key) where key does not exist', function () {
        var db = temporals.db;
        var users = db.read('users/*');

        db['delete']('users/does-not-exist');
        QUnit.deepEqual(db.read('users/*'), users, 'nothing was removed');
    });

    QUnit.test('delete(key) where required arguments are missing', function () {
        QUnit.throws(function () {
            temporals.db['delete']();
        }, E.ArgsError, 'key is missing');
    });
});