// author: Seth Thomas

define([
    'src/js/utils',
    'src/js/shim',
    'src/js/schema'
], function (Utils, Shim, Schema) {
    // CRUDdy database
    // provides a schema backed CRUD access layer to a CRUD data store

    var forEach = Utils.forEach;
    var ErrorClassFactory = Utils.ErrorClassFactory;
    var isUndefinedOrNull = Utils.isUndefinedOrNull;

    var ArgsError = ErrorClassFactory('ArgsError');

    function isCruddy(obj) {
        // returns true if the object supports CRUD operations: create, read, update and delete

        var isValid = true;
        forEach('create read update delete'.split(' '), function (_, operation) {
            if (typeof obj[operation] !== 'function') {
                isValid = false;
                return false;
            }
        });

        return isValid;
    }

    function generateStorageKey(table, id) {
        return table + '/' + id;
    }

    function extractTableAndIds(key) {
        // extracts the table name and id(s) from the key
        // expected format "table/id[,id]*" where whitespace is tolerated between the ids
        // ex: "users/ab123,cd456,ef789"
        // returns a dictionary containing the table name and array of ids

        var originalKey = key;

        function E() {
            throw new ArgsError('"' + originalKey + '" must be in "table/id[,id]" ex: "users/123" or "users/123,456,789"');
        }

        var m = key.match(/^(.+)\//);
        if (!m) {
            E();
        }
        // pull the table name out
        var tableName = m[1];
        key = key.replace(m[1] + '/', '');

        // remove whitespace (front, back and following a ",")
        key = key.replace(/^\s*/, '').replace(/\s*$/, '').replace(/,\s*/, ',');

        var ids = key.split(',');

        if (ids.length === 0) {
            E();
        }

        return {
            tableName: tableName,
            ids: ids
        };
    }

    function CruddyDB(schema, storage) {
        var cls = CruddyDB;

        if (isUndefinedOrNull(storage)) {
            throw new ArgsError('storage is missing');
        }
        if (isUndefinedOrNull(schema)) {
            throw new ArgsError('schema is missing');
        }

        // verify the storage object supports CRUD operations
        if (!isCruddy(storage)) {
            throw new ArgsError('storage must support CRUD operations');
        }

        this._internals = {
            cls: cls,
            storage: storage,
            schema: schema,
            schemaValidator: new Schema.SchemaValidator(schema, storage)
        };
    }

    CruddyDB.prototype.create = function create(tableName, newRows) {
        var sv = this._internals.schemaValidator;
        var storage = this._internals.storage;
        var multiRx = /\/\*$/; // multi is indicated using table/*; ex: "users/*"

        if (multiRx.test(tableName)) {
            tableName = tableName.replace(multiRx, '');
        } else {
            // single row; convert to bulk format
            newRows = [newRows];
        }

        var fixedRows = [];

        // validate all of the rows first before we create any;
        // we don't want a partially successful operation
        forEach(newRows, function (_, row) {
            var fixed = sv.fixup(tableName, row);

            if (!fixed.id) {
                // "id" should be auto-generated if it's not explicitly set,
                // but it's possible that someone is using an SV that
                // doesn't do this; it isn't required as long as the
                // row explicitly has an "id"
                throw new ArgsError('row must have an "id"');
            }
            fixedRows.push(fixed);
        });

        forEach(fixedRows, function (_, row) {
            var key = generateStorageKey(tableName, row.id);

            // save the new row to storage
            storage.create(key, row);
        });

        return fixedRows;
    };

    CruddyDB.prototype.read = function read(key) {
        if (isUndefinedOrNull(key)) {
            throw new ArgsError('key is missing');
        }
        if (typeof key !== 'string') {
            throw new ArgsError('key must be a string');
        }

        var storage = this._internals.storage;
        var results;

        if (key.match(/\*/)) {
            // wildcard query
            results = storage.read(key);
            if (isUndefinedOrNull(results)) {
                return {};
            }
            return results;
        }

        var extracted = extractTableAndIds(key);
        var tableName = extracted.tableName;
        var ids = extracted.ids;

        results = {};

        // individually fetch each row
        forEach(ids, function (_, id) {
            // should only be a single row
            var rows = storage.read(tableName + '/' + id);
            forEach(rows, function (rowKey, row) {
                results[rowKey] = row;
            });
        });

        return results;
    };

    CruddyDB.prototype.update = function update(key, updatedRow) {
        // update row(s)
        // update a single row:
        //   update('users/123', {/* updated row object */})
        // update multiple rows:
        //   update('users/*', {'123': {/* updated row object */}, '456': {/* updated row object /*}})

        function updateRow(tableName, id, row) {
            var fixed = sv.fixup(tableName, row);

            // no news is good news
            storage.update(tableName + '/' + id, fixed);

            return fixed;
        }

        if (isUndefinedOrNull(key)) {
            throw new ArgsError('key is missing');
        }
        if (typeof key !== 'string') {
            throw new ArgsError('key must be a string');
        }
        if (isUndefinedOrNull(updatedRow)) {
            throw new ArgsError('value is missing');
        }

        var sv = this._internals.schemaValidator;
        var storage = this._internals.storage;
        var tableRx = /^([^\*]+)\//;
        var multiRx = /^\*$/;
        var idRx = /^([a-z0-9]+)$/i;
        var m;

        m = key.match(tableRx);
        if (!m) {
            throw new ArgsError('"' + key + '" is not in the format "table/id" or "table/*"');
        }
        var tableName = m[1];
        key = key.replace(tableRx, '');

        if (multiRx.test(key)) {
            // multiple row format

            // make sure that all of the rows are valid before we update anything
            // we want to avoid partial updates
            forEach(updatedRow, function (_, row) {
                if (!sv.test(tableName, row)) {
                    throw new ArgsError('one or more rows are invalid');
                }
            });

            // now we can go ahead and update
            forEach(updatedRow, function (k, row) {
                updatedRow[k] = updateRow(tableName, row.id, row);
            });
        } else {
            // single row format
            m = key.match(idRx);
            if (!m) {
                throw new ArgsError('"' + key + '" is not in the format "table/id" or "table/*"');
            }
            if (isUndefinedOrNull(updatedRow.id)) {
                updatedRow.id = m[1];
            }
            if (updatedRow.id !== m[1]) {
                throw new ArgsError('key "id" must match the updated row "id"');
            }

            updatedRow = updateRow(tableName, m[1], updatedRow);
        }

        return updatedRow;
    };

    CruddyDB.prototype['delete'] = function delete_(key) {
        if (isUndefinedOrNull(key)) {
            throw new ArgsError('key is missing');
        }
        if (typeof key !== 'string') {
            throw new ArgsError('key must be a string');
        }

        var storage = this._internals.storage;

        if (key.match(/\*/)) {
            // wildcard query
            return storage['delete'](key);
        }

        var extracted = extractTableAndIds(key);
        var tableName = extracted.tableName;
        var ids = extracted.ids;

        // individually remove each row
        forEach(ids, function (_, id) {
            storage['delete'](tableName + '/' + id);
        });
    };

    return {
        CruddyDB: CruddyDB,
        exceptions: {
            ArgsError: ArgsError
        }
    };
});