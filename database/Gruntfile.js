module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            options: {},
            files: ['src/js/*.js', 'tests/*.js']
        },
        qunit: {
            all: ['tests/*.html']
        },
        watch: {
            js: {
                files: ['src/js/*.js', 'tests/*.js'],
                tasks: ['jshint', 'qunit']
            }
        }
    });

    // Load the plugins
    grunt.loadNpmTasks('grunt-contrib');

    // Default task(s)
    grunt.registerTask('default', ['jshint', 'qunit', 'watch']);
};