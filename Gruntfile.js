module.exports = function(grunt) {

  grunt.initConfig({
    babel: {
      options: {
        sourceMap: true,
        presets: ['@babel/preset-env']
      },
      dist: {
        files: {
          'bootstrap/javascript/transpiledComponents.js': 'bootstrap/javascript/components/*.es',
          'bootstrap/javascript/transpiled.js': 'bootstrap/javascript/*.es',
        }
      }
    },
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
        src: ['bootstrap/javascript/transpiledComponents.js', 'bootstrap/javascript/ang.main.js', 'bootstrap/javascript/*.js'],
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
      before: {
        src: ['public/javascript/*', 'public/stylesheets/*']
      },
      after: {
        src: ['bootstrap/javascript/transpiled.js', 'bootstrap/javascript/transpiledComponents.js', 'bootstrap/javascript/*.js.map', 'public/stylesheets/*.css', '!public/stylesheets/main.min.css']
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
  grunt.loadNpmTasks('grunt-babel');

  grunt.registerTask('dev', ['clean:before', 'babel', 'less:development', 'concat', 'uglify:development', 'cssmin', 'clean:after', 'watch']);
  grunt.registerTask('default', ['clean:before', 'babel', 'less:development', 'concat', 'cssmin', 'uglify:development', 'clean:after']);

};
