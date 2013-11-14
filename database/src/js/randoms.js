// author: Seth Thomas

(function (window) {
    function getInt(from, to) {
        // returns a random integer between "from" and "to", inclusive
        // signatures:
        //   getInt() => 0
        //   getInt(to) => getInt(0, to)
        //   getInt(from, to)
        //   getInt(from, to) where from > to => getInt(to, from)

        from = from || 0;
        to = to || 0;

        if (from > to) {
            var temp = from;
            from = to;
            to = temp;
        }

        var range = to - from + 1;
        return Math.floor(Math.random() * range) + from;
    }

    var getId = (function () {
        var numbers = '0123456789';
        var alphabet = 'abcdefghijklmnopqrstuvwxyz';
        var language = numbers + alphabet + alphabet.toUpperCase();
        var range = language.length - 1;

        return function getId(length) {
            // returns a random alphanumeric string of length X
            if (typeof length !== 'number') {
                throw new Error('length must be a number');
            }
            if (length < 0) {
                throw new Error('negative lengths are not allowed');
            }

            var id = [];
            for (var i = 0; i < length; ++i) {
                id[i] = language[getInt(0, range)];
            }
            return id.join('');
        };
    })();

    var Randoms = {
        getInt: getInt,
        getId: getId
    };

    if (typeof define === "function" && define.amd) {
        // amd compliant environment, so use that
        define(function() {
            return Randoms;
        });
    } else {
        // add to the window "Randoms" namespace
        if (window.Randoms === undefined) {
            window.Randoms = {};
        }
        for (var k in Randoms) {
            if (Randoms.hasOwnProperty(k)) {
                window.Randoms[k] = Randoms[k];
            }
        }
    }
})(window);