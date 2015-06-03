module.exports = function(grunt) {

  grunt.initConfig({
    bump: {
      options: {
        pushTo: 'origin'
      }
    }
  });
  grunt.loadNpmTasks('grunt-bump');

};
