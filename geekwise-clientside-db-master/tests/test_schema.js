define([
    'src/js/utils',
    'src/js/schema',
    'src/js/cruddylocalstorage'
], function (Utils, Schema, Storage) {
    QUnit.start();

    var forEach = Utils.forEach;
    var NAMESPACE = 'test_schema';
    var S = Schema;
    var E = S.exceptions;
    var temporals = {};

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

    QUnit.module('constructor', {
        teardown: generalCleanup
    });

    QUnit.test('constructor(schema, storage)', function () {
        var schema = {
            users: {
                firstName: 'string:min[1]:max[20]',
                lastName: 'string:max[20]',
                nickName: 'string:max[20]',
                email: 'string'
            }
        };
        var storage = new Storage(NAMESPACE);
        var validator = new S.SchemaValidator(schema, storage);

        QUnit.ok(validator, 'no errors means the validator was created ok');
    });

    QUnit.test('constructor(schema) where storage is missing', function () {
        var schema = {
            users: {
                firstName: 'string:min[1]:max[20]',
                lastName: 'string:max[20]',
                nickName: 'string:max[20]',
                email: 'string'
            }
        };
        QUnit.throws(function () {
            var validator = new S.SchemaValidator(schema);
        }, E.ArgsError, 'missing storage object');
    });

    QUnit.test('constructor(schema, storage) where storage does not have a read method', function () {
        var schema = {
            users: {
                firstName: 'string:min[1]:max[20]',
                lastName: 'string:max[20]',
                nickName: 'string:max[20]',
                email: 'string'
            }
        };
        var storage = {};
        QUnit.throws(function () {
            var validator = new S.SchemaValidator(schema, storage);
        }, E.ArgsError, 'storage object does not have a read method');
    });

    QUnit.test('constructor(undefined, storage) where schema is missing', function () {
        var storage = new Storage(NAMESPACE);
        QUnit.throws(function () {
            var validator = new S.SchemaValidator(undefined, storage);
        }, E.ArgsError, 'missing schema');
    });

    QUnit.module('fieldWalker', {
        teardown: generalCleanup
    });

    QUnit.test('fieldWalker(string)', function () {
        var input = 'string';
        var storage = {read: sinon.stub()};
        var output = S.fieldWalker(input, storage);

        QUnit.ok(output instanceof S.StringProperty, 'produce a StringProperty instance');
        QUnit.deepEqual(output._internals, {
            isAlphaNumeric: false,
            auto: undefined,
            min: undefined,
            max: undefined
        }, 'verify internal state');
    });

    QUnit.test('fieldWalker(string:an)', function () {
        var input = 'string:an';
        var storage = {read: sinon.stub()};
        var output = S.fieldWalker(input, storage);

        QUnit.ok(output instanceof S.StringProperty, 'produce a StringProperty instance');
        QUnit.deepEqual(output._internals, {
            isAlphaNumeric: true,
            auto: undefined,
            min: undefined,
            max: undefined
        }, 'verify internal state');
    });

    QUnit.test('fieldWalker(string:an:auto[X])', function () {
        var input = 'string:an:auto[5]';
        var storage = {read: sinon.stub()};
        var output = S.fieldWalker(input, storage);

        QUnit.ok(output instanceof S.StringProperty, 'produce a StringProperty instance');
        QUnit.deepEqual(output._internals, {
            isAlphaNumeric: true,
            auto: 5,
            min: undefined,
            max: undefined
        }, 'verify internal state');
    });

    QUnit.test('fieldWalker(string:auto[X]:an)', function () {
        var input = 'string:auto[5]:an';
        var storage = {read: sinon.stub()};
        var output = S.fieldWalker(input, storage);

        QUnit.ok(output instanceof S.StringProperty, 'produce a StringProperty instance');
        QUnit.deepEqual(output._internals, {
            isAlphaNumeric: true,
            auto: 5,
            min: undefined,
            max: undefined
        }, 'verify internal state');
    });

    QUnit.test('fieldWalker(string:an:auto[X]:max[M])', function () {
        var input = 'string:an:auto[5]:max[20]';
        var storage = {read: sinon.stub()};
        var output = S.fieldWalker(input, storage);

        QUnit.ok(output instanceof S.StringProperty, 'produce a StringProperty instance');
        QUnit.deepEqual(output._internals, {
            isAlphaNumeric: true,
            auto: 5,
            min: undefined,
            max: 20
        }, 'verify internal state');
    });

    QUnit.test('fieldWalker(string:an:auto[X]:min[N]:max[M])', function () {
        var input = 'string:an:auto[8]:min[5]:max[20]';
        var storage = {read: sinon.stub()};
        var output = S.fieldWalker(input, storage);

        QUnit.ok(output instanceof S.StringProperty, 'produce a StringProperty instance');
        QUnit.deepEqual(output._internals, {
            isAlphaNumeric: true,
            auto: 8,
            min: 5,
            max: 20
        }, 'verify internal state');
    });

    QUnit.test('fieldWalker(string:min[N]:max[M]:an:auto[X])', function () {
        var input = 'string:min[5]:max[20]:an:auto[8]';
        var storage = {read: sinon.stub()};
        var output = S.fieldWalker(input, storage);

        QUnit.ok(output instanceof S.StringProperty, 'produce a StringProperty instance');
        QUnit.deepEqual(output._internals, {
            isAlphaNumeric: true,
            auto: 8,
            min: 5,
            max: 20
        }, 'verify internal state');
    });

    QUnit.test('fieldWalker(string:auto[X]) where :an is missing', function () {
        var input = 'string:auto[5]';
        var storage = {read: sinon.stub()};
        QUnit.throws(function () {
            S.fieldWalker(input, storage);
        }, E.ArgsError, 'can only auto-generate alphanumeric strings');
    });

    QUnit.test('fieldWalker(string:an:auto) where auto is missing [X]', function () {
        var input = 'string:an:auto';
        var storage = {read: sinon.stub()};
        QUnit.throws(function () {
            S.fieldWalker(input, storage);
        }, E.ArgsError, 'must specify a length for the auto-generated alphanumeric');
    });

    QUnit.test('fieldWalker(ref=X)', function () {
        var input = 'ref=users';
        var storage = {read: sinon.stub()};
        var output = S.fieldWalker(input, storage);

        QUnit.ok(output instanceof S.RefProperty, 'produce a RefProperty instance');
        QUnit.deepEqual(output._internals, {
            table: 'users',
            storage: storage
        });
    });

    QUnit.test('fieldWalker(array:string)', function () {
        var input = 'array:string:an';
        var storage = {read: sinon.stub()};
        var output = S.fieldWalker(input, storage);

        QUnit.ok(output instanceof S.ArrayProperty, 'produce an ArrayProperty instance');
        QUnit.ok(output._internals.innerProperty instanceof S.StringProperty, 'internally holds a StringProperty instance');
        QUnit.deepEqual(output._internals.innerProperty._internals, {
            isAlphaNumeric: true,
            auto: undefined,
            min: undefined,
            max: undefined
        }, 'verify internal state');
    });

    QUnit.test('fieldWalker(array:ref=users)', function () {
        var input = 'array:ref=users';
        var storage = {read: sinon.stub()};
        var output = S.fieldWalker(input, storage);

        QUnit.ok(output instanceof S.ArrayProperty, 'produce an ArrayProperty instance');
        QUnit.ok(output._internals.innerProperty instanceof S.RefProperty, 'internally holds a RefProperty instance');
        QUnit.deepEqual(output._internals.innerProperty._internals, {
            table: 'users',
            storage: storage
        });
    });

    QUnit.test('fieldWalker(array:array:string:an:auto[5]', function () {
        var input = 'array:array:string:an:auto[5]';
        var storage = {read: sinon.stub()};
        var outerArray = S.fieldWalker(input, storage);
        var innerArray = outerArray._internals.innerProperty;
        var stringProp = innerArray._internals.innerProperty;

        QUnit.ok(outerArray instanceof S.ArrayProperty, 'produce an ArrayProperty instance');
        QUnit.ok(innerArray instanceof S.ArrayProperty, 'internally holds an ArrayProperty instance');
        QUnit.ok(stringProp instanceof S.StringProperty, 'inner array internally holds a StringProperty instance');
        QUnit.deepEqual(stringProp._internals, {
            isAlphaNumeric: true,
            auto: 5,
            min: undefined,
            max: undefined
        }, 'verify internal state');
    });

    QUnit.test('fieldWalker(string:an:an) where duplicate syntax', function () {
        var input = 'string:an:an';
        var storage = {read: sinon.stub()};
        QUnit.throws(function () {
            S.fieldWalker(input, storage);
        }, E.ArgsError, 'duplicate :an');
    });

    QUnit.test('fieldWalker(array:foo) unknown type', function () {
        var input = 'array:foo';
        var storage = {read: sinon.stub()};
        QUnit.throws(function () {
            S.fieldWalker(input, storage);
        }, E.ArgsError, '"foo" is an unknown type');
    });

    QUnit.test('fieldWalker(foo) unknown type', function () {
        var input = 'foo';
        var storage = {read: sinon.stub()};
        QUnit.throws(function () {
            S.fieldWalker(input, storage);
        }, E.ArgsError, '"foo" is an unknown type');
    });

    QUnit.test('fieldWalker(array:) missing type for array contents', function () {
        var input = 'array:';
        var storage = {read: sinon.stub()};
        QUnit.throws(function () {
            S.fieldWalker(input, storage);
        }, E.ArgsError, 'missing type for array contents');
    });

    QUnit.module('StringProperty', {
        teardown: generalCleanup
    });

    QUnit.test('constructor(isAlphaNumeric, auto, min, max) where auto is less than min', function () {
        QUnit.throws(function () {
            var property = new S.StringProperty(true, 1, 5);
        }, E.ArgsError, 'auto is less than the minimum length');
    });

    QUnit.test('constructor(isAlphaNumeric, auto, min, max) where auto is greater than max', function () {
        QUnit.throws(function () {
            var property = new S.StringProperty(true, 20, undefined, 10);
        }, E.ArgsError, 'auto is greater than the minimum length');
    });

    QUnit.test('constructor(isAlphaNumeric, auto) where min and max are undefined', function () {
        QUnit.ok(new S.StringProperty(true, 5), 'do not need to provide a min and max to use auto');
    });

    QUnit.test('constructor(isAlphaNumeric, auto) where isAlphaNumeric is false', function () {
        QUnit.throws(function () {
            var property = new S.StringProperty(false, 5);
        }, E.ArgsError, 'must be an alphanumeric string to use the auto feature');
    });

    QUnit.test('test(string) where normal StringProperty', function () {
        var property = new S.StringProperty(false);
        QUnit.ok(property.test('this is a string'), 'strings are accepted');
        QUnit.ok(!property.test(10), 'non-strings are not accepted');
    });

    QUnit.test('test(string) where StringProperty is alphanumeric', function () {
        var property = new S.StringProperty(true);
        QUnit.ok(property.test('ab12'), 'alphanumeric strings are accepted');
        QUnit.ok(!property.test('non alphanumeric'), 'non-alphanumeric strings are not accepted');
        QUnit.ok(!property.test(10), 'non-strings are not accepted');
    });

    QUnit.test('test(string) where StringProperty is an auto-generated alphanumeric', function () {
        var property = new S.StringProperty(true, 10);
        QUnit.ok(property.test('ab12'), 'alphanumeric strings are accepted');
        QUnit.ok(property.test(''), 'empty string is accepted');
        QUnit.ok(property.test(undefined), 'undefined is accepted');
        QUnit.ok(property.test(null), 'null is accepted');
        QUnit.ok(!property.test('non alphanumeric'), 'non-alphanumeric strings are not accepted');
        QUnit.ok(!property.test(10), 'non-strings are not accepted');
    });

    QUnit.test('test(string) where StringProperty has a min length', function () {
        var property = new S.StringProperty(false, undefined, 5);
        QUnit.ok(property.test('hello'), 'minimum length accepted');
        QUnit.ok(property.test('hello world'), 'more than minimum length accepted');
        QUnit.ok(!property.test('hi'), 'string shorter than minimum length not accepted');
    });

    QUnit.test('test(string) where StringProperty has a max length', function () {
        var property = new S.StringProperty(false, undefined, undefined, 11);
        QUnit.ok(property.test('hello world'), 'maximum length accepted');
        QUnit.ok(property.test('hello'), 'less than maximum length accepted');
        QUnit.ok(!property.test('hello world!'), 'string longer than maximum length not accepted');
    });

    QUnit.test('fixup(string) where StringProperty is not alphanumeric auto', function () {
        var property = new S.StringProperty();
        QUnit.strictEqual(property.fixup('hello'), 'hello', 'no change to value');
        QUnit.strictEqual(property.fixup(''), '', 'empty string is left unchanged');
    });

    QUnit.test('fixup(string) where StringProperty is auto-generated alphanumeric', function () {
        try {
            sinon.stub(Math, 'random', function () {
                return 0;
            });
            var property = new S.StringProperty(true, 5);
            QUnit.strictEqual(property.fixup('hello'), 'hello', 'no change to value');
            QUnit.strictEqual(property.fixup('00000'), '00000', 'auto-generated value');
        } finally {
            if (Math.random.restore) {
                Math.random.restore();
            }
        }
    });

    QUnit.module('RefProperty', {
        setup: function () {
            temporals.storage = new Storage(NAMESPACE);
            temporals.storage.create('animals/001', {
                id: '001',
                name: 'jackal'
            });
            temporals.property = new S.RefProperty('animals', temporals.storage);
        },
        teardown: generalCleanup
    });

    QUnit.test('constructor() where table and storage are missing', function () {
        QUnit.throws(function () {
            var property = new S.RefProperty();
        }, E.ArgsError, 'missing table and storage');
    });

    QUnit.test('constructor(table) where storage is missing', function () {
        QUnit.throws(function () {
            var property = new S.RefProperty('animals');
        }, E.ArgsError, 'missing storage');
    });

    QUnit.test('constructor(table, storage) where table is undefined or null', function () {
        QUnit.throws(function () {
            var property = new S.RefProperty(undefined, temporals.storage);
        }, E.ArgsError, 'table is undefined');

        QUnit.throws(function () {
            var property = new S.RefProperty(null, temporals.storage);
        }, E.ArgsError, 'table is null');
    });

    QUnit.test('test(string) where string matches an ID in the referenced table', function () {
        QUnit.ok(temporals.property.test('001'), 'string matches ID in referenced table');
    });

    QUnit.test('test(string) where string does not match an ID in the referenced table', function () {
        QUnit.ok(!temporals.property.test('002'), 'string does not match ID in the referenced table');
    });

    QUnit.test('fixup(string)', function () {
        QUnit.strictEqual(temporals.property.fixup('001'), '001', 'no change to value');
        QUnit.strictEqual(temporals.property.fixup(''), '', 'no change to value');
    });

    QUnit.module('ArrayProperty', {
        setup: function () {
            var stringProperty = new S.StringProperty(true, 5, 5, 10);
            temporals.arrayProperty = new S.ArrayProperty(stringProperty);
        },
        teardown: generalCleanup
    });

    QUnit.test('constructor()', function () {
        QUnit.throws(function () {
            var property = new S.ArrayProperty();
        }, E.ArgsError, 'missing inner property');
    });

    QUnit.test('constructor(innerProperty) where inner property is not a FieldProperty', function () {
        QUnit.throws(function () {
            var property = new S.ArrayProperty({});
        }, E.ArgsError, 'not a recognized FieldProperty');
    });

    QUnit.test('test(array) where array is empty', function () {
        QUnit.ok(temporals.arrayProperty.test([]), 'no items');
    });

    QUnit.test('test(value) where value is null or undefined', function () {
        QUnit.ok(!temporals.arrayProperty.test(), 'undefined fails');
        QUnit.ok(!temporals.arrayProperty.test(null), 'null fails');
    });

    QUnit.test('test(array) where array contains all valid items', function () {
        QUnit.ok(temporals.arrayProperty.test(['hello', 'worlds', '']), 'all items pass inner property test');
    });

    QUnit.test('test(array) where array contains some invalid items', function () {
        QUnit.ok(!temporals.arrayProperty.test(['hello', 'world', '!']), "each item must pass the array's inner property test");
    });

    QUnit.test('test(non-array) where a non-array value is passed in', function () {
        QUnit.ok(!temporals.arrayProperty.test({}), 'value must be an array');
        QUnit.ok(!temporals.arrayProperty.test('hello'), 'having a .length is not enough');
    });

    QUnit.test('fixup(array)', function () {
        sinon.stub(Math, 'random', function () {
            return 0;
        });
        QUnit.deepEqual(temporals.arrayProperty.fixup(['', 'hello']), ['00000', 'hello'], 'each item should be fixed up according to inner property');
    });

    QUnit.module('Table', {
        teardown: generalCleanup
    });

    QUnit.test('constructor() missing required arguments', function () {
        QUnit.throws(function () {
            var table = new S.Table();
        }, E.ArgsError, 'missing name and fields');

        QUnit.throws(function () {
            var table = new S.Table('users');
        }, E.ArgsError, 'missing fields');

        QUnit.throws(function () {
            var table = new S.Table(undefined, {
                id: new S.StringProperty()
            });
        }, E.ArgsError, 'missing name');
    });

    QUnit.test('constructor(name, fields) where fields does not have an "id" field', function () {
        var table = new S.Table('users', {
            name: new S.StringProperty()
        });
        QUnit.ok(table.test({
            name: 'Bob',
            id: '001'
        }), '"id" field should be implicitly provided');
    });

    QUnit.test('constructor(name, fields) where fields contains an unrecognized field type', function () {
        QUnit.throws(function () {
            var table = new S.Table('users', {
                name: new S.StringProperty(),
                email: {}
            }, E.ArgsError, 'unrecognized field type');
        });
    });

    QUnit.test('test(value) "id" nuances', function () {
        var table = new S.Table('users', {
            name: new S.StringProperty(false, undefined, 1, 10),
            msgs: new S.ArrayProperty(new S.StringProperty())
        });

        QUnit.ok(table.test({
            name: 'Bob',
            msgs: ['hello', 'world!']
        }), '"id" is auto-generated, so does not have to be included');

        QUnit.ok(table.test({
            id: '001',
            name: 'Bob',
            msgs: ['hello', 'world!']
        }), '"id" can be explicitly provided');

        QUnit.ok(table.test({
            id: '',
            name: 'Bob',
            msgs: ['hello', 'world!']
        }), '"id" can be explicitly provided as empty');
    });

    QUnit.test('test(value) where value has an unexpected field', function () {
        var table = new S.Table('users', {
            name: new S.StringProperty(false, undefined, 1, 10),
            msgs: new S.ArrayProperty(new S.StringProperty())
        });

        QUnit.ok(!table.test({
            name: 'Bob',
            msgs: ['hello', 'world!'],
            email: 'bob@test.com'
        }), 'value has an unexpected field');
    });

    QUnit.test('test(value) where value is missing a field', function () {
        var table = new S.Table('users', {
            name: new S.StringProperty(false, undefined, 1, 10),
            msgs: new S.ArrayProperty(new S.StringProperty())
        });

        QUnit.ok(!table.test({
            name: 'Bob'
        }), 'value is missing a field');
    });

    QUnit.test('test(value) where value has an invalid field value', function () {
        var table = new S.Table('users', {
            name: new S.StringProperty(false, undefined, 1, 10),
            msgs: new S.ArrayProperty(new S.StringProperty())
        });

        QUnit.ok(!table.test({
            name: 'Bob the Builder',
            msgs: ['hello', 'world!']
        }), 'value has an invalid field value');
    });

    QUnit.test('fixup(value) "id" nuances', function () {
        sinon.stub(Math, 'random', function () {
            return 0;
        });

        var table = new S.Table('users', {
            name: new S.StringProperty(false, undefined, 1, 10)
        });

        QUnit.deepEqual(table.fixup({
            name: 'Bob'
        }), {
            id: '00000',
            name: 'Bob'
        }, '"id" is auto-generated, so does not have to be included');

        QUnit.deepEqual(table.fixup({
            id: '001',
            name: 'Bob'
        }), {
            id: '001',
            name: 'Bob'
        }, '"id" can be explicitly provided');

        QUnit.deepEqual(table.fixup({
            id: '',
            name: 'Bob'
        }), {
            id: '00000',
            name: 'Bob'
        }, '"id" can be explicitly provided as empty');
    });

    QUnit.test('fixup(value) where value contains an array', function () {
        sinon.stub(Math, 'random', function () {
            return 0;
        });

        var table = new S.Table('users', {
            name: new S.StringProperty(false, undefined, 1, 10),
            ids: new S.ArrayProperty(new S.StringProperty(true, 5))
        });

        QUnit.deepEqual(table.fixup({
            name: 'Bob',
            ids: ['foo', 'bar']
        }), {
            id: '00000',
            name: 'Bob',
            ids: ['foo', 'bar']
        }, 'no change to array');

        QUnit.deepEqual(table.fixup({
            id: '001',
            name: 'Bob',
            ids: ['foo', '', undefined]
        }), {
            id: '001',
            name: 'Bob',
            ids: ['foo', '00000', '00000']
        }, 'auto-generate array values');
    });

    QUnit.test('fixup(value) where value has an unexpected field', function () {
        var table = new S.Table('users', {
            name: new S.StringProperty(false, undefined, 1, 10)
        });

        QUnit.throws(function () {
            table.fixup({
                name: 'Bob',
                email: 'bob@test.com'
            });
        }, E.ArgsError, 'value has an unexpected field');
    });

    QUnit.test('fixup(value) where value is missing a field', function () {
        sinon.stub(Math, 'random', function () {
            return 0;
        });

        var table = new S.Table('users', {
            name: new S.StringProperty(false, undefined, 1, 10),
            msgs: new S.ArrayProperty(new S.StringProperty())
        });

        QUnit.throws(function () {
            table.fixup({
                name: 'Bob'
            });
        }, E.ArgsError, 'value is missing a field');
    });

    QUnit.module('parse', {
        setup: function () {
            temporals.storage = new Storage(NAMESPACE);
            temporals.schema = {
                users: {
                    firstName: 'string:min[5]:max[20]',
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
        },
        teardown: generalCleanup
    });

    QUnit.test('parse(schema, storage) where required arguments are missing', function () {
        QUnit.throws(function () {
            S.parse();
        }, E.ArgsError, 'schema and storage are missing');

        QUnit.throws(function () {
            S.parse(temporals.schema);
        }, E.ArgsError, 'storage is missing');

        QUnit.throws(function () {
            S.parse(undefined, temporals.storage);
        }, E.ArgsError, 'schema is missing');
    });

    QUnit.test('parse(schema, storage) where schema has an unrecognized field type', function () {
        QUnit.throws(function () {
            temporals.schema.users.foo = 'bar';
            S.parse(temporals.schema, temporals.storage);
        }, E.ArgsError, 'unrecognized field type in schema');
    });

    QUnit.test('parse(schema, storage) where schema has a field referencing an undeclared table', function () {
        QUnit.throws(function () {
            temporals.schema.users.foo = 'ref=bar';
            S.parse(temporals.schema, temporals.storage);
        }, E.ArgsError, 'reference to an undeclared table in schema');
    });

    QUnit.test('parse(schema, storage) where schema is valid', function () {
        var tables = S.parse(temporals.schema, temporals.storage);
        QUnit.ok(tables.users instanceof S.Table, 'users table is present');
        QUnit.ok(tables.messages instanceof S.Table, 'messages table is present');
        QUnit.ok(tables.conversations instanceof S.Table, 'conversations table is present');
        QUnit.ok(tables.projects instanceof S.Table, 'projects table is present');
    });

    QUnit.module('SchemaValidator', {
        setup: function () {
            temporals.storage = new Storage(NAMESPACE);
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
        },
        teardown: generalCleanup
    });

    QUnit.test('constructor(schema, storage) where required arguments are missing', function () {
        QUnit.throws(function () {
            var sv = new S.SchemaValidator();
        }, E.ArgsError, 'schema and storage are missing');

        QUnit.throws(function () {
            var sv = new S.SchemaValidator(temporals.schema);
        }, E.ArgsError, 'storage is missing');

        QUnit.throws(function () {
            var sv = new S.SchemaValidator(undefined, temporals.storage);
        }, E.ArgsError, 'schema is missing');
    });

    QUnit.test('constructor(schema, storage) where schema is invalid', function () {
        QUnit.throws(function () {
            temporals.schema.users.foo = 'bar';
            var sv = new S.SchemaValidator(temporals.schema, temporals.storage);
        }, E.ArgsError, 'schema is invalid');
    });

    QUnit.test('constructor(schema, storage) where storage does not have a "read" method', function () {
        QUnit.throws(function () {
            temporals.storage.read = undefined;
            var sv = new S.SchemaValidator(temporals.schema, temporals.storage);
        }, E.ArgsError, 'storage missing a "read" method');
    });

    QUnit.test('test(tableName, value) where value is accepted', function () {
        var sv = new S.SchemaValidator(temporals.schema, temporals.storage);
        QUnit.ok(sv.test('users', {
            firstName: 'Bob',
            lastName: 'Builder',
            nickName: 'BB',
            email: 'bob@test.com'
        }), 'value is accepted');
    });

    QUnit.test('test(tableName, value) where value is rejected', function () {
        var sv = new S.SchemaValidator(temporals.schema, temporals.storage);
        QUnit.ok(!sv.test('users', {
            firstName: 'Bob',
            lastName: 'Builder',
            nickName: 'BB',
            email: 'bob@test.com',
            foo: 'bar'
        }), 'value is rejected');
    });

    QUnit.test('test(tableName, value) where table name is missing', function () {
        var sv = new S.SchemaValidator(temporals.schema, temporals.storage);

        QUnit.throws(function () {
            sv.test(undefined, {
                firstName: 'Bob',
                lastName: 'Builder',
                nickName: 'BB',
                email: 'bob@test.com'
            });
        }, E.ArgsError, 'table name is missing');
    });

    QUnit.test('test(tableName, value) where table name is unrecognized', function () {
        var sv = new S.SchemaValidator(temporals.schema, temporals.storage);

        QUnit.throws(function () {
            sv.test('fizzbuzz', {
                firstName: 'Bob',
                lastName: 'Builder',
                nickName: 'BB',
                email: 'bob@test.com'
            });
        }, E.ArgsError, 'table name is unrecognized');
    });

    QUnit.test('test(tableName, value) where value is missing', function () {
        var sv = new S.SchemaValidator(temporals.schema, temporals.storage);

        QUnit.throws(function () {
            sv.test('users');
        }, E.ArgsError, 'values is missing');
    });

    QUnit.test('fixup(tableName, value) where value is fixed', function () {
        sinon.stub(Math, 'random', function () {
            return 0;
        });
        var sv = new S.SchemaValidator(temporals.schema, temporals.storage);
        QUnit.deepEqual(sv.fixup('users', {
            firstName: 'Bob',
            lastName: 'Builder',
            nickName: 'BB',
            email: 'bob@test.com'
        }), {
            id: '00000',
            firstName: 'Bob',
            lastName: 'Builder',
            nickName: 'BB',
            email: 'bob@test.com'
        }, 'value is fixed up');
    });

    QUnit.test('fixup(tableName, value) where table name is missing', function () {
        var sv = new S.SchemaValidator(temporals.schema, temporals.storage);

        QUnit.throws(function () {
            sv.fixup(undefined, {
                firstName: 'Bob',
                lastName: 'Builder',
                nickName: 'BB',
                email: 'bob@test.com'
            });
        }, E.ArgsError, 'table name is missing');
    });

    QUnit.test('fixup(tableName, value) where table name is unrecognized', function () {
        var sv = new S.SchemaValidator(temporals.schema, temporals.storage);

        QUnit.throws(function () {
            sv.fixup('fizzbuzz', {
                firstName: 'Bob',
                lastName: 'Builder',
                nickName: 'BB',
                email: 'bob@test.com'
            });
        }, E.ArgsError, 'table name is unrecognized');
    });

    QUnit.test('fixup(tableName, value) where value is missing', function () {
        var sv = new S.SchemaValidator(temporals.schema, temporals.storage);

        QUnit.throws(function () {
            sv.fixup('users');
        }, E.ArgsError, 'values is missing');
    });
});