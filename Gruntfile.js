module.exports = function(grunt) {

  grunt.initConfig({
    less: {
      development: {
        options: {
          paths: ['public/stylesheets']
        },
        files: [{
          expand: true,
          cwd: 'bootstrap/less',
          src: ['*.less'],
          dest: 'public/stylesheets/',
          ext: '.css'
        }]
      }
    },
    concat: {
      js: {
        src: ['bootstrap/javascript/*.js'],
        dest: 'public/javascript/main.min.js',
      }
    },
    uglify: {
      development: {
        files: {
          'public/javascript/main.min.js': ['public/javascript/main.min.js']
        }
      }
    },
    cssmin: {
      options: {
        mergeIntoShorthands: false,
        roundingPrecision: -1
      },
      target: {
        files: {
          'public/stylesheets/main.min.css': ['public/stylesheets/*.css']
        }
      }
    },
    clean: {
      before : {
        src: ['public/javascript/*', 'public/stylesheets/*']
      },
      after : {
        src: ['public/stylesheets/*.css', '!public/stylesheets/main.min.css']
      }
    },
    watch: {
      less: {
        files: ['bootstrap/less/*.less'],
        tasks: ['less'],
      },
      javascript: {
        files: ['bootstrap/javascript/*.js'],
        tasks: ['concat', 'uglify:development'],
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('dev', ['clean:before', 'less:development', 'concat', 'uglify:development', 'cssmin', 'clean:after', 'watch']);
  grunt.registerTask('default', ['clean:before', 'less:development', 'concat', 'cssmin', 'uglify:development', 'clean:after']);

};
