// author: Seth Thomas

(function () {
    function main(generateId, ErrorClassFactory) {
        // supports a very simple schema syntax
        /*
        schema declaration is an object where keys=table names
        and values=table field declarations

        example schema:

        {
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
        }

        fields can be declared with the following types:

        string - accepts a string primitive
          string:an - indicates the string must be alphanumeric
          string:an:auto[N] - indicates that the field will be auto-generated if it is missing (alphanumeric only)
          string:min[M] - indicates the minimum length of the string
          string:max[M] - indicates the maximum length of the string
        ref=<table> - indicates that a row with the ID must exist in the referenced table
        array:<type> - indicates that the field will contain a list of <type>

        NOTE: every table has an implicit field:
          id: 'string:an:auto[5]'
        unless it is explicitly declared.
        */

        var ArgsError = ErrorClassFactory('ArgsError');

        function isUndefinedOrNull(value) {
            return value === undefined || value === null;
        }

        // declare the properties inside self-calling functions so that
        // we don't end up with named function collisions

        var FieldProperty = (function () {
            function FieldProperty() {}
            FieldProperty.prototype.test = function test() {return true;};
            FieldProperty.prototype.fixup = function fixup(value) {return value;};

            return FieldProperty;
        })();

        var StringProperty = (function () {
            function StringProperty(isAlphaNumeric, auto, min, max) {
                if (!isUndefinedOrNull(auto)) {
                    if (!isAlphaNumeric) {
                        throw new ArgsError('must be an alphanumeric to use the auto feature');
                    }
                    if (!isUndefinedOrNull(min) && auto < min) {
                        throw new ArgsError('auto-generated length is less than the minimum length');
                    }
                    if (!isUndefinedOrNull(max) && auto > max) {
                        throw new ArgsError('auto-generated length is greater than the maximum length');
                    }
                }

                this._internals = {
                    isAlphaNumeric: isAlphaNumeric,
                    auto: auto,
                    min: min,
                    max: max
                };
            }

            StringProperty.prototype = new FieldProperty();

            StringProperty.prototype.test = function test(value) {
                // tests whether the value meets the criteria

                if (!isUndefinedOrNull(this._internals.auto) && (isUndefinedOrNull(value) || value === '')) {
                    // skip further testing; the value will be auto-generated
                    return true;
                }

                if (typeof value !== 'string') {
                    return false;
                }

                if (this._internals.isAlphaNumeric && !/^[0-9a-z]+$/i.test(value)) {
                    return false;
                }

                if (!isUndefinedOrNull(this._internals.min) && value.length < this._internals.min) {
                    return false;
                }

                if (!isUndefinedOrNull(this._internals.max) && value.length > this._internals.max) {
                    return false;
                }

                return true;
            };

            StringProperty.prototype.fixup = function fixup(value) {
                if (!isUndefinedOrNull(this._internals.auto) && (isUndefinedOrNull(value) || value === '')) {
                    value = generateId(this._internals.auto);
                }
                return value;
            };

            return StringProperty;
        })();

        var RefProperty = (function () {
            function RefProperty(table, storage) {
                if (isUndefinedOrNull(table)) {
                    throw new ArgsError('table is missing');
                }
                if (isUndefinedOrNull(storage)) {
                    throw new ArgsError('storage is missing');
                }

                this._internals = {
                    table: table,
                    storage: storage
                };
            }

            RefProperty.prototype = new FieldProperty();

            RefProperty.prototype.test = function test(value) {
                var matches = this._internals.storage.read(this._internals.table + '/' + value);
                for (var m in matches) {
                    if (matches.hasOwnProperty(m)) {
                        // verified that the row exists
                        return true;
                    }
                }
                return false;
            };

            return RefProperty;
        })();

        var ArrayProperty = (function () {
            function ArrayProperty(innerProperty) {
                if (!(innerProperty instanceof FieldProperty)) {
                    throw new ArgsError('"' + (typeof innerProperty) + '" is not a recognized property type');
                }

                this._internals = {
                    innerProperty: innerProperty
                };
            }

            ArrayProperty.prototype = new FieldProperty();
            ArrayProperty.prototype.test = function test(value) {
                if (Object.prototype.toString.call(value) !== '[object Array]') {
                    // non-array value
                    return false;
                }

                // verify each item in the array
                for (var i = 0, len = value.length; i < len; ++i) {
                    if (!this._internals.innerProperty.test(value[i])) {
                        return false;
                    }
                }
                return true;
            };
            ArrayProperty.prototype.fixup = function fixup(value) {
                for (var i = 0, len = value.length; i < len; ++i) {
                    value[i] = this._internals.innerProperty.fixup(value[i]);
                }
                return value;
            };

            return ArrayProperty;
        })();

        var fieldWalker = (function () {
            function parseString(field) {
                var original = field;

                field = field.replace(/^string/i, '');

                var rxAuto = /:auto\[(\d+)\]/i;
                var rxAlphaNumeric = /:an/i;
                var rxMin = /:min\[(\d+)\]/;
                var rxMax = /:max\[(\d+)\]/;

                var match;
                var isAlphaNumeric;
                var auto;
                var min;
                var max;

                isAlphaNumeric = rxAlphaNumeric.test(field);
                field = field.replace(rxAlphaNumeric, '');

                if (isAlphaNumeric) {
                    match = field.match(rxAuto);
                    if (match) {
                        auto = parseInt(match[1], 10);
                        field = field.replace(rxAuto, '');
                    }
                }

                match = field.match(rxMin);
                if (match) {
                    min = parseInt(match[1], 10);
                    field = field.replace(rxMin, '');
                }

                match = field.match(rxMax);
                if (match) {
                    max = parseInt(match[1], 10);
                    field = field.replace(rxMax, '');
                }

                if (field !== '') {
                    throw new ArgsError('invalid field declaration "' + original + '"');
                }

                return new StringProperty(isAlphaNumeric, auto, min, max);
            }

            function parseRef(field, storage) {
                var match = field.match(/^ref=(.*)$/i);
                return new RefProperty(match[1], storage);
            }

            function parseArray(field, storage) {
                field = field.replace(/^array:/i, '');

                return new ArrayProperty(fieldWalker(field, storage));
            }

            function fieldWalker(field, storage) {
                if (typeof field !== 'string') {
                    throw new ArgsError('field declarations must be strings');
                }

                if (/^string/i.test(field)) {
                    return parseString(field);
                }
                if (/^ref=./i.test(field)) {
                    return parseRef(field, storage);
                }
                if (/^array:./i.test(field)) {
                    return parseArray(field, storage);
                }
                throw new ArgsError('invalid field "' + field + '"');
            }

            return fieldWalker;
        })();

        var Table = (function () {
            function Table(name, fields) {
                if (isUndefinedOrNull(name)) {
                    throw new ArgsError('name is missing');
                }

                if (isUndefinedOrNull(fields)) {
                    throw new ArgsError('fields is missing');
                }

                var hasId = false;
                for (var key in fields) {
                    if (fields.hasOwnProperty(key)) {
                        if (!(fields[key] instanceof FieldProperty)) {
                            throw new ArgsError('fields must be FieldProperty instances');
                        }
                        if (key === 'id') {
                            hasId = true;
                        }
                    }
                }

                if (!hasId) {
                    // each table is expected to have an "id" field
                    // if missing, add it
                    fields.id = new StringProperty(true, 5);
                }

                this._internals = {
                    name: name,
                    fields: fields
                };
            }
            Table.prototype.test = function test(value) {
                // verify that the value object only contains properties
                // known by the table and that each property passes validation
                // returns true if valid, otherwise return false

                var key;

                // verify every key in value has a corresponding field property
                for (key in value) {
                    if (value.hasOwnProperty(key)) {
                        if (!this._internals.fields.hasOwnProperty(key)) {
                            // doesn't have a corresponding field property
                            return false;
                        }
                    }
                }

                for (key in this._internals.fields) {
                    if (this._internals.fields.hasOwnProperty(key)) {
                        if (!this._internals.fields[key].test(value[key])) {
                            // failed property validation
                            return false;
                        }
                    }
                }

                return true;
            };
            Table.prototype.fixup = function fixup(value) {
                // fixup each property of value
                // returns the fixed up value object

                if (!this.test(value)) {
                    throw new ArgsError('invalid value format');
                }

                for (var key in this._internals.fields) {
                    if (this._internals.fields.hasOwnProperty(key)) {
                        value[key] = this._internals.fields[key].fixup(value[key]);
                    }
                }

                return value;
            };

            return Table;
        })();

        function parse(schema, storage) {
            // walk the schema and create the property objects

            var tables = {};
            var references = [];
            var match;
            var fields;

            if (isUndefinedOrNull(schema)) {
                throw new ArgsError('schema is missing');
            }
            if (isUndefinedOrNull(storage)) {
                throw new ArgsError('storage is missing');
            }

            for (var tableName in schema) {
                if (schema.hasOwnProperty(tableName)) {
                    fields = {};
                    for (var fieldName in schema[tableName]) {
                        if (schema[tableName].hasOwnProperty(fieldName)) {
                            fields[fieldName] = fieldWalker(schema[tableName][fieldName], storage);

                            match = schema[tableName][fieldName].match(/ref=(.*)/i);
                            if (match) {
                                references.push(match[1]);
                            }
                        }
                    }
                    tables[tableName] = new Table(tableName, fields);
                }
            }
            for (var i = 0, len = references.length; i < len; ++i) {
                if (!tables.hasOwnProperty(references[i])) {
                    throw new ArgsError('table "' + references[i] + '" was referenced, but not declared');
                }
            }

            return tables;
        }

        var SchemaValidator = (function () {
            // a schema validator is responsible for enforcing a series of
            // rules based on a schema specification
            function SchemaValidator(schema, storage) {
                if (!schema) {
                    throw new ArgsError('schema is missing');
                }
                if (storage === undefined) {
                    throw new ArgsError('storage is missing');
                }
                if (typeof storage.read !== 'function') {
                    throw new ArgsError('storage object must have a read method');
                }

                this._internals = {
                    cls: SchemaValidator,
                    schema: schema,
                    storage: storage,
                    tables: parse(schema, storage)
                };
            }

            SchemaValidator.prototype.test = function test(tableName, value) {
                if (!this._internals.tables.hasOwnProperty(tableName)) {
                    throw new ArgsError('"' + tableName + '" is not a recognized table');
                }
                if (isUndefinedOrNull(value)) {
                    throw new ArgsError('value is missing');
                }
                return this._internals.tables[tableName].test(value);
            };

            SchemaValidator.prototype.fixup = function fixup(tableName, value) {
                if (!this._internals.tables.hasOwnProperty(tableName)) {
                    throw new ArgsError('"' + tableName + '" is not a recognized table');
                }
                if (isUndefinedOrNull(value)) {
                    throw new ArgsError('value is missing');
                }
                return this._internals.tables[tableName].fixup(value);
            };

            return SchemaValidator;
        })();

        return {
            SchemaValidator: SchemaValidator,
            Table: Table,
            parse: parse,
            fieldWalker: fieldWalker,
            FieldProperty: FieldProperty,
            StringProperty: StringProperty,
            RefProperty: RefProperty,
            ArrayProperty: ArrayProperty,
            exceptions: {
                ArgsError: ArgsError
            }
        };
    }

    if (typeof define === "function" && define.amd) {
        // amd compliant environment, so use that
        define([
            'src/js/randoms',
            'src/js/utils'
        ], function (Randoms, Utils) {
            return main(Randoms.getId, Utils.ErrorClassFactory);
        });
	} else {
        // provide the initialization function to the global scope
        // an outside user will have to provide the dependencies themselves
        window.SchemaValidator = window.SchemaValidator || {};
        window.SchemaValidator.initialize = main;
    }
})();