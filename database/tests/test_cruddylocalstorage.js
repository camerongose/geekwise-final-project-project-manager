require([
    '../src/js/cruddylocalstorage'
], function (Storage) {
    var LS = window.localStorage;
    var NAMESPACE = 'cruddy';
    var temporals = {}; // variables created in the setup and removed in the teardown

    function cleanupLocalStorage() {
        // remove all keys that start with NAMESPACE from the localstorage
        var regex = new RegExp('^' + NAMESPACE + '.');
        for (var k in LS) {
            if (LS.hasOwnProperty(k)) {
                if (regex.test(k)) {
                    LS.removeItem(k);
                }
            }
        }
    }

    function clearTemporals() {
        // clear out the temporals object
        temporals = {};
    }

    var setupAndTeardown = {
        setup: function () {
            temporals.storage = new Storage(NAMESPACE);
        }, teardown: function () {
            cleanupLocalStorage();
            clearTemporals();
        }
    };

    QUnit.start();

    QUnit.module('constructor');

    QUnit.test('constructor()', function () {
        QUnit.throws(function () {
            var storage = new Storage();
        }, Error, 'missing namespace');
    });

    QUnit.test('constructor(namespace)', function () {
        var storage = new Storage(NAMESPACE);
        QUnit.ok(storage instanceof Storage, 'minimal set of constructor arguments');
        QUnit.strictEqual(storage.toString(), '<CruddyLocalStorage namespace="' + NAMESPACE + '">', 'toString()');
    });

    QUnit.test('constructor(namespace) where namespace is a non-string', function () {
        QUnit.throws(function () {
            var storage = new Storage({namespace: NAMESPACE}); // nope! doesn't accept a settings object
        }, Error, 'namespace must be a string');

        QUnit.throws(function () {
            var storage = new Storage('');
        }, Error, 'namespace can not be an empty string');
    });

    QUnit.test('constructor(namespace) where namespace contains a wildcard', function () {
        QUnit.throws(function () {
            var storage = new Storage('foo*');
        }, Error, 'namespace can not contain a wildcard');
    });

    QUnit.module('create', setupAndTeardown);

    QUnit.test('create(key, value) where value is a primitive', function () {
        temporals.storage.create('foo', 10);

        var actual = JSON.parse(LS.getItem(Storage.addNamespaceToKey(NAMESPACE, 'foo')));
        QUnit.strictEqual(actual, 10, 'assert the primitive was in localstorage');
    });

    QUnit.test('create(key, value) where value is an object', function () {
        temporals.storage.create('foo', {bar: 'wizz'});

        var actual = JSON.parse(LS.getItem(Storage.addNamespaceToKey(NAMESPACE, 'foo')));
        QUnit.deepEqual(actual, {bar: 'wizz'}, 'assert the object was in localstorage');
    });

    QUnit.test('create(key, value) where key already exists', function () {
        temporals.storage.create('foo', 'a');
        QUnit.throws(function () {
            temporals.storage.create('foo', 'b');
        }, Error, 'throw an error if the key already exists');
        QUnit.strictEqual(LS.getItem(Storage.addNamespaceToKey(NAMESPACE, 'foo')), '"a"', 'assert the original value is still set');
    });

    QUnit.test('create(key, value) where value is null or undefined', function () {
        QUnit.throws(function () {
            temporals.storage.create('foo', null);
        }, Error, 'null is not an accepted value');

        QUnit.throws(function () {
            temporals.storage.create('foo', undefined);
        }, Error, 'undefined is not an accepted value');
    });

    QUnit.test('create(key, value) where key is a non-string or empty string', function () {
        QUnit.throws(function () {
            temporals.storage.create(null, 'a');
        }, Error, 'null is not an accepted key');

        QUnit.throws(function () {
            temporals.storage.create(undefined, 'a');
        }, Error, 'undefined is not an accepted key');

        QUnit.throws(function () {
            temporals.storage.create(10, 'a');
        }, Error, 'non-string primitives are not an accepted key');

        QUnit.throws(function () {
            temporals.storage.create({key: 'foo'}, 'a');
        }, Error, 'non-string objects are not an accepted key');

        QUnit.throws(function () {
            temporals.storage.create('', 'a');
        }, Error, 'empty string is not an accepted key');
    });

    QUnit.test('create(key, value) where key contains a wildcard', function () {
        QUnit.throws(function () {
            temporals.storage.create('foo*', 'a');
        }, Error, 'wildcards are not accepted in the key');
    });

    QUnit.module('read', setupAndTeardown);

    QUnit.test('read()', function () {
        QUnit.throws(function () {
            temporals.storage.read();
        }, Error, 'must provide a query key');
    });

    QUnit.test('read(key)', function () {
        temporals.storage.create('foo', 10);
        temporals.storage.create('bar', 20);
        temporals.storage.create('wizz.bang', {A: 'apples'});
        QUnit.deepEqual(temporals.storage.read('foo'), {'foo': 10});
        QUnit.deepEqual(temporals.storage.read('bar'), {'bar': 20});
        QUnit.deepEqual(temporals.storage.read('wizz.bang'), {'wizz.bang': {'A': 'apples'}});
    });

    QUnit.test('read(key) where key ends with a wildcard', function () {
        temporals.storage.create('users/001', {
            id: '001',
            name: 'Bob'
        });
        temporals.storage.create('users/002', {
            id: '002',
            name: 'John'
        });
        temporals.storage.create('users/003', {
            id: '003',
            name: 'Alice'
        });
        temporals.storage.create('projects/001', 'something new');
        temporals.storage.create('projects/002', 'something blue');

        QUnit.deepEqual(temporals.storage.read('users/*'), {
            'users/001': {
                id: '001',
                name: 'Bob'
            },
            'users/002': {
                id: '002',
                name: 'John'
            },
            'users/003': {
                id: '003',
                name: 'Alice'
            }
        }, 'should find all of the users');
    });

    QUnit.test('read(key) where key begins with a wildcard', function () {
        temporals.storage.create('users/001', {
            id: '001',
            name: 'Bob'
        });
        temporals.storage.create('users/002', {
            id: '002',
            name: 'John'
        });
        temporals.storage.create('users/003', {
            id: '003',
            name: 'Alice'
        });
        temporals.storage.create('projects/001', 'something new');
        temporals.storage.create('projects/002', 'something blue');

        QUnit.deepEqual(temporals.storage.read('*/001'), {
            'users/001': {
                id: '001',
                name: 'Bob'
            },
            'projects/001': 'something new'
        }, 'should find all rows that match "*/001"');
    });

    QUnit.test('read(key) where key contains a wildcard in the middle', function () {
        temporals.storage.create('users/001', {
            id: '001',
            name: 'Bob'
        });
        temporals.storage.create('users/002', {
            id: '002',
            name: 'John'
        });
        temporals.storage.create('users/003', {
            id: '003',
            name: 'Alice'
        });
        temporals.storage.create('projects/001', 'something new');
        temporals.storage.create('projects/002', 'something blue');
        temporals.storage.create('projects/101', 'something used');

        QUnit.deepEqual(temporals.storage.read('projects/*01'), {
            'projects/001': 'something new',
            'projects/101': 'something used'
        }, 'should find all rows that match "projects/*01"');
    });

    QUnit.test('read(key) where key contains multiple wildcards', function () {
        temporals.storage.create('users/001', {
            id: '001',
            name: 'Bob'
        });
        temporals.storage.create('users/002', {
            id: '002',
            name: 'John'
        });
        temporals.storage.create('users/003', {
            id: '003',
            name: 'Alice'
        });
        temporals.storage.create('projects/001', 'something new');
        temporals.storage.create('projects/002', 'something blue');
        temporals.storage.create('projects/101', 'something used');

        QUnit.deepEqual(temporals.storage.read('*/*01'), {
            'users/001': {
                id: '001',
                name: 'Bob'
            },
            'projects/001': 'something new',
            'projects/101': 'something used'
        }, 'should find all rows that match "*/*01"');
    });

    QUnit.test('read(key) where key is a wildcard', function () {
        temporals.storage.create('users/001', {
            id: '001',
            name: 'Bob'
        });
        temporals.storage.create('users/002', {
            id: '002',
            name: 'John'
        });
        temporals.storage.create('users/003', {
            id: '003',
            name: 'Alice'
        });
        temporals.storage.create('projects/001', 'something new');
        temporals.storage.create('projects/002', 'something blue');
        temporals.storage.create('projects/101', 'something used');

        QUnit.deepEqual(temporals.storage.read('*'), {
            'users/001': {
                id: '001',
                name: 'Bob'
            },
            'users/002': {
                id: '002',
                name: 'John'
            },
            'users/003': {
                id: '003',
                name: 'Alice'
            },
            'projects/001': 'something new',
            'projects/002': 'something blue',
            'projects/101': 'something used'
        }, 'should find all rows');
    });

    QUnit.test('read(key) where key is a non-string or empty string', function () {
        QUnit.throws(function () {
            temporals.storage.read(10);
        }, Error, 'non-string primitive keys are not accepted');

        QUnit.throws(function () {
            temporals.storage.read({key: 'foo'});
        }, Error, 'object keys are not accepted');

        QUnit.throws(function () {
            temporals.storage.read('');
        }, Error, 'empty string is not accepted');
    });

    QUnit.test('read(key) where no match is found', function () {
        temporals.storage.create('users/001', {
            id: '001',
            name: 'Bob'
        });
        temporals.storage.create('users/002', {
            id: '002',
            name: 'John'
        });
        temporals.storage.create('users/003', {
            id: '003',
            name: 'Alice'
        });
        temporals.storage.create('projects/001', 'something new');
        temporals.storage.create('projects/002', 'something blue');
        temporals.storage.create('projects/101', 'something used');

        QUnit.deepEqual(temporals.storage.read('conversations/*'), {}, 'no matches found');
    });

    QUnit.module('update', setupAndTeardown);

    QUnit.test('update(key, value) where value is a primitive', function () {
        temporals.storage.create('users/001', {
            id: '001',
            name: 'Bob'
        });
        temporals.storage.create('users/002', {
            id: '002',
            name: 'John'
        });
        temporals.storage.create('users/003', {
            id: '003',
            name: 'Alice'
        });
        temporals.storage.create('projects/001', 'something new');
        temporals.storage.create('projects/002', 'something blue');
        temporals.storage.create('projects/101', 'something used');

        temporals.storage.update('projects/001', 'something very new');
        QUnit.deepEqual(
            temporals.storage.read('projects/001'),
            {'projects/001': 'something very new'},
            'primitive was updated'
        );
        QUnit.deepEqual(
            temporals.storage.read('projects/002'),
            {'projects/002': 'something blue'},
            'not matches rows were not updated'
        );
    });

    QUnit.test('update(key, value) where value is an object', function () {
        temporals.storage.create('users/001', {
            id: '001',
            name: 'Bob'
        });
        temporals.storage.create('users/002', {
            id: '002',
            name: 'John'
        });
        temporals.storage.create('users/003', {
            id: '003',
            name: 'Alice'
        });
        temporals.storage.create('projects/001', 'something new');
        temporals.storage.create('projects/002', 'something blue');
        temporals.storage.create('projects/101', 'something used');

        temporals.storage.update('users/001', {
            id: '001',
            name: 'Bobby'
        });
        QUnit.deepEqual(
            temporals.storage.read('users/001'),
            {
                'users/001': {
                    id: '001',
                    name: 'Bobby'
                }
            },
            'object was updated'
        );
        QUnit.deepEqual(
            temporals.storage.read('users/002'),
            {
                'users/002': {
                    id: '002',
                    name: 'John'
                }
            },
            'not matches rows were not updated'
        );
    });

    QUnit.test('update(key, value) where key does not exist', function () {
        temporals.storage.create('projects/001', 'something new');
        temporals.storage.create('projects/002', 'something blue');
        temporals.storage.create('projects/101', 'something used');

        QUnit.throws(function () {
            temporals.storage.update('projects/004', 'something non-existent');
        }, Error, 'key must exist');
    });

    QUnit.test('update(key, value) where value is null or undefined', function () {
        QUnit.throws(function () {
            temporals.storage.update(null, 'foo');
        }, Error, 'null is not an accepted key');

        QUnit.throws(function () {
            temporals.storage.update(undefined, 'foo');
        }, Error, 'undefined is not an accepted key');
    });

    QUnit.test('update(key, value) where key is a non-string or empty string', function () {
        QUnit.throws(function () {
            temporals.storage.update({key: 'skeleton'}, 'foo');
        }, Error, 'key may not be a non-string type');

        QUnit.throws(function () {
            temporals.storage.update('', 'foo');
        }, Error, 'key must be a non-empty string');
    });

    QUnit.test('update(key, value) where key contains a wildcard', function () {
        QUnit.throws(function () {
            temporals.storage.update('projects/*', 'latest and greatest');
        }, Error, 'wildcards are not accepted in the key');
    });

    QUnit.module('delete', setupAndTeardown);

    QUnit.test('delete()', function () {
        QUnit.throws(function () {
            temporals.storage['delete']();
        }, Error, 'must provide a non-empty string query key');
    });

    QUnit.test('delete(key, value) where value is null or undefined', function () {
        QUnit.throws(function () {
            temporals.storage['delete'](null);
        }, Error, 'null is not an accepted key');

        QUnit.throws(function () {
            temporals.storage['delete'](undefined);
        }, Error, 'undefined is not an accepted key');
    });

    QUnit.test('delete(key) where key is a non-string or empty string', function () {
        QUnit.throws(function () {
            temporals.storage['delete']({key: 'skeleton'});
        }, Error, 'key may not be a non-string type');

        QUnit.throws(function () {
            temporals.storage['delete']('');
        }, Error, 'key must be a non-empty string');
    });

    QUnit.test('delete(key)', function () {
        // remove the one matching row
        temporals.storage.create('users/001', {
            id: '001',
            name: 'Bob'
        });
        temporals.storage.create('users/002', {
            id: '002',
            name: 'John'
        });
        temporals.storage.create('users/003', {
            id: '003',
            name: 'Alice'
        });

        temporals.storage['delete']('users/002');
        QUnit.deepEqual(
            temporals.storage.read('users/*'),
            {
                'users/001': {
                    id: '001',
                    name: 'Bob'
                },
                'users/003': {
                    id: '003',
                    name: 'Alice'
                }
            },
            'only the matched row should be deleted'
        );
    });

    QUnit.test('delete(key) where key contains a wildcard', function () {
        // remove all matching rows
        temporals.storage.create('projects/001', 'something new');
        temporals.storage.create('projects/002', 'something blue');
        temporals.storage.create('projects/101', 'something used');

        temporals.storage['delete']('projects/*01');
        QUnit.deepEqual(
            temporals.storage.read('projects/*'),
            {
                'projects/002': 'something blue'
            },
            'all matching rows should be deleted'
        );
    });

    QUnit.test('delete(key) where key is a wildcard', function () {
        // remove all
        temporals.storage.create('projects/001', 'something new');
        temporals.storage.create('projects/002', 'something blue');
        temporals.storage.create('projects/101', 'something used');

        temporals.storage['delete']('*');
        QUnit.deepEqual(
            temporals.storage.read('*'),
            {},
            'all rows should be deleted'
        );
    });

    QUnit.test('delete(key) where key does not exist', function () {
        // remove nothing
        temporals.storage.create('projects/001', 'something new');
        temporals.storage.create('projects/002', 'something blue');
        temporals.storage.create('projects/101', 'something used');

        temporals.storage['delete']('projects/does-not-exist');
        QUnit.deepEqual(
            temporals.storage.read('projects/*'),
            {
                'projects/001': 'something new',
                'projects/002': 'something blue',
                'projects/101': 'something used'
            },
            'no rows should be deleted'
        );
    });
});