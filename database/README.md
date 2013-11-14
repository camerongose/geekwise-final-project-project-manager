geekwise-clientside-db
======================

Client side local storage database

See /demo/app.js for an example of how to create an instance of the database and interact with it.

Schema
======

Supported types:
  - "string"
  - "array"
  - "ref"

"string" sub-properties:
  - ":min[x]"     defines the minimum size allowed for a string value
  - ":max[x]"     defines the maximum size allowed for a string value
  - ":an"         string value must be alphanumeric
  - ":an:auto[x]" auto-generates an alphanumeric value of the indicated size, if it's missing

"string" examples:
  "string"                  field values must be strings of unrestrained length
  "string:min[5]:max[20]"   field values must be a string from 5..20 characters in length
  "string:max[20]"          field values must be a string no greater than 20 characters in length
  "string:an:auto[5]:min[5]:max[10]"
                            field values must be alphanumeric strings from 5..10 characters in length
                            will auto-generate a random alphanumeric string of length=5 if not explicitly provided

"array" sub-properties:
  - ":x"     where "x" is a supported type; "array" creates a list of any other supported type

"array" examples:
  "array:string"            field values can be an array of string values
  "array:ref=some-table"    field values must be IDs for rows that exist in a table called "some-table"
  "array:array:string"      field values must be arrays of arrays of string values
  "array:string:min[5]:max[10]"
                            notice that the "string" type supports all of it's normal sub-properties
                            each item in the array must obey the "string" rules

"ref" sub-properties:
  - "=x"     where "x" is the name of a table; field values must be IDs for existing rows in table "x"

"ref" examples:
  "ref=some-table"     field values must be an ID of a row that already exists in table "some-table"

Example Schema:

{
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
}
