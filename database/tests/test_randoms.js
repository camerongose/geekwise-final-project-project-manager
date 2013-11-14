require([
    '../src/js/randoms'
], function (Randoms) {
    var getInt = Randoms.getInt;
    var getId = Randoms.getId;

    QUnit.start();

    QUnit.module('getInt', {
        setup: function () {
            sinon.stub(Math, "random", function () {
                // predictably random
                return 0.5;
            });
        },
        teardown: function () {
            if (Math.random.restore) {
                Math.random.restore();
            }
        }
    });

    QUnit.test('getInt()', function () {
        QUnit.strictEqual(getInt(0), 0, 'always returns 0');
    });

    QUnit.test('getInt(to)', function () {
        QUnit.strictEqual(getInt(5), 3, 'positive "to" value');
        QUnit.strictEqual(getInt(-5), -2, 'negative "to" value');
        QUnit.strictEqual(getInt(0), 0, '"to" == 0');
    });

    QUnit.test('getInt(from, to)', function () {
        QUnit.strictEqual(getInt(1, 5), 3, 'positive "to" and "from"');
        QUnit.strictEqual(getInt(-5, -1), -3, 'negative "to" and "from"');
        QUnit.strictEqual(getInt(-5, 2), -1, 'negative "to" and positive "from"');
    });

    QUnit.test('getInt(from, to) where to < from', function () {
        QUnit.strictEqual(getInt(5, 1), 3, 'positive "to" and "from"');
        QUnit.strictEqual(getInt(-1, -5), -3, 'negative "to" and "from"');
        QUnit.strictEqual(getInt(5, -1), 2, 'positive "to" and negative "from"');
    });

    QUnit.test('lower bounds', function () {
        // verify that random values including the lower bound can be generated
        if (Math.random.restore) {
            Math.random.restore();
        }
        try {
            sinon.stub(Math, "random", function () {
                return 0;
            });
            QUnit.strictEqual(getInt(1, 5), 1, 'positive lower bound');
            QUnit.strictEqual(getInt(-5, -1), -5, 'negative lower bound');
        } finally {
            Math.random.restore();
        }
    });

    QUnit.test('upper bounds', function () {
        // verify that random values including the upper bound can be generated
        if (Math.random.restore) {
            Math.random.restore();
        }
        try {
            sinon.stub(Math, "random", function () {
                return 0.99;
            });

            QUnit.strictEqual(getInt(1, 5), 5, 'positive upper bound');
            QUnit.strictEqual(getInt(-5, -1), -1, 'negative upper bound');
        } finally {
            Math.random.restore();
        }
    });

    QUnit.module('getId', {
        setup: function () {
            sinon.stub(Math, 'random', (function () {
                var length = 10 + 26 + 26;
                var step = 1.0 / length;
                var current = 0.0;
                return function () {
                    // returns the 2n character per call, where n is the number of calls

                    current += step;
                    if (current >= 1) {
                        current = 0;
                    }

                    current += step;
                    if (current >= 100) {
                        current = 0;
                    }

                    return current;
                };
            })());
        },
        teardown: function () {
            if (Math.random.restore) {
                Math.random.restore();
            }
        }
    });

    QUnit.test('getId()', function () {
        QUnit.throws(function () {
            getId();
        }, Error, 'must provide a length argument');
    });

    QUnit.test('getId(length)', function () {
        QUnit.strictEqual(getId(20), '24689bdfhjlnprtvxzBD', 'length 20');
    });

    QUnit.test('lower bound', function () {
        // verify that it's possible to generate the first character in
        // the range of potential characters
        if (Math.random.restore) {
            Math.random.restore();
        }
        try {
            sinon.stub(Math, 'random', function () {
                return 0.0;
            });
            QUnit.strictEqual(getId(1), '0', 'lower bound');
        } finally {
            Math.random.restore();
        }
    });

    QUnit.test('upper bound', function () {
        // verify that it's possible to generate the last character in
        // the range of potential characters
        if (Math.random.restore) {
            Math.random.restore();
        }
        try {
            sinon.stub(Math, 'random', function () {
                return 0.99;
            });
            QUnit.strictEqual(getId(1), 'Z', 'upper bound');
        } finally {
            Math.random.restore();
        }
    });
});