// author: Seth Thomas

define([], function () {
    // CRUDdy Local Storage
    // a CRUD interface to the localStorage object

    function CruddyLocalStorage(namespace) {
        if (!namespace || typeof namespace !== 'string') {
            // we are sharing the localstorage with everything else
            // the browser encounters; it would be silly to not
            // use a namespace to uniquely identify our content;
            // the namespace will be automatically prefixed to all keys
            throw new Error('must provide a non-empty string namespace');
        }

        if (this._hasWildcard(namespace)) {
            throw new Error('namespace may not contain a "*" wildcard');
        }

        this._internals = {
            cls: CruddyLocalStorage,
            namespace: namespace
        };
    }

    CruddyLocalStorage.addNamespaceToKey = function addNamespaceToKey(namespace, key) {
        return namespace + '/' + key;
    };

    CruddyLocalStorage.removeNamespaceFromKey = function removeNamespaceFromKey(namespace, key) {
        return key.replace(new RegExp('^' + namespace + '/'), '');
    };

    CruddyLocalStorage.prototype._hasWildcard = function _hasWildcard(key) {
        // returns true if the key contains a wildcard, otherwise false
        return (/\*/.test(key));
    };

    CruddyLocalStorage.prototype._addNamespaceToKey = function _addNamespaceToKey(key) {
        // returns the namespaced key
        return this._internals.cls.addNamespaceToKey(this._internals.namespace, key);
    };

    CruddyLocalStorage.prototype._removeNamespaceFromKey = function _removeNamespaceFromKey(key) {
        // returns the key with the namespace removed
        return this._internals.cls.removeNamespaceFromKey(this._internals.namespace, key);
    };

    CruddyLocalStorage.prototype._exists = function _exists(key) {
        // returns true if the key already exists in the localstorage,
        // otherwise false

        var item = window.localStorage.getItem(key);
        return item !== null;
    };

    CruddyLocalStorage.prototype.create = function create(key, value) {
        if (typeof key !== 'string') {
            throw new Error('key must be a string');
        }
        if (key === '') {
            throw new Error('key may not be an empty string');
        }
        if (value === null || value === undefined) {
            throw new Error('value may not be null or undefined');
        }
        if (this._hasWildcard(key)) {
            throw new Error('key may not contain the * wildcard');
        }

        var fullKey = this._addNamespaceToKey(key);

        if (this._exists(fullKey)) {
            throw new Error('a value already exists for that key');
        }

        var stringified = JSON.stringify(value);
        window.localStorage.setItem(fullKey, stringified);
    };

    CruddyLocalStorage.prototype.read = function read(key) {
        // returns a k/v dictionary of the rows that match the query key
        // the dictionary key is the localstorage key minus the namespace
        if (typeof key !== 'string') {
            throw new Error('must provide a string query key');
        }
        if (key === '') {
            throw new Error('must provide a non-empty string query key');
        }

        var fullKey = this._addNamespaceToKey(key);
        var results = {};

        if (this._hasWildcard(key)) {
            // wildcard search
            var regex = new RegExp(fullKey.replace('*', '.*'));
            for (var k in window.localStorage) {
                if (window.localStorage.hasOwnProperty(k)) {
                    if (regex.test(k)) {
                        results[this._removeNamespaceFromKey(k)] = JSON.parse(window.localStorage.getItem(k));
                    }
                }
            }
        } else {
            // exact match search
            if (this._exists(fullKey)) {
                results[key] = JSON.parse(window.localStorage.getItem(fullKey));
            }
        }
        return results;
    };

    CruddyLocalStorage.prototype.update = function update(key, value) {
        if (typeof key !== 'string') {
            throw new Error('must provide a string query key');
        }
        if (key === '') {
            throw new Error('must provide a non-empty string query key');
        }
        if (value === null || value === undefined) {
            throw new Error('value may not be null or undefined');
        }
        if (this._hasWildcard(key)) {
            throw new Error('key may not contain the * wildcard');
        }

        var fullKey = this._addNamespaceToKey(key);

        if (!this._exists(fullKey)) {
            throw new Error('the key must exist');
        }

        var stringified = JSON.stringify(value);
        window.localStorage.setItem(fullKey, stringified);
    };

    CruddyLocalStorage.prototype['delete'] = function delete_(key) {
        if (typeof key !== 'string') {
            throw new Error('must provide a string query key');
        }
        if (key === '') {
            throw new Error('must provide a non-empty string query key');
        }

        var rows = this.read(key);
        for (var k in rows) {
            if (rows.hasOwnProperty(k)) {
                window.localStorage.removeItem(this._addNamespaceToKey(k));
            }
        }
    };

    CruddyLocalStorage.prototype.toString = function toString() {
        return '<CruddyLocalStorage namespace="' + this._internals.namespace + '">';
    };

    return CruddyLocalStorage;
});