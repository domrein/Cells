var gulp = require('gulp');

var traceur = require('gulp-traceur');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

var paths = {
  scripts: ['js/**/*.js']
};

gulp.task('scripts', [], function() {
  return gulp.src(paths.scripts)
    .pipe(traceur({experimental: true}))
    .pipe(uglify())
    .pipe(concat('cells.min.js'))
    .pipe(gulp.dest('build'));
});

// Rerun the task when a file changes
gulp.task('watch', function() {
  gulp.watch(paths.scripts, ['scripts']);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['scripts', 'watch']);
