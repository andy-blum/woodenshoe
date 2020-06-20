// Initialize modules
// Importing specific gulp API functions lets us write them below as series() instead of gulp.series()
const {gulp, src, dest, watch, series, parallel } = require('gulp');
// Importing all the Gulp-related packages we want to use
const sourcemaps = require('gulp-sourcemaps');
const sass = require('gulp-sass');
const sassGlob = require('gulp-sass-glob');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify-es').default;
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const svgSymbols = require('gulp-svg-symbols');
const beeper = require('beeper');
const notify = require('gulp-notify');
const del = require('del');
const { exec } = require('child_process');
const server = require('browser-sync').create();




const srcPath = {
  scss: 'src/scss/**/*.scss',
  js: 'src/js/**/*.js',
  svg: 'src/svg/**/*.svg'
}

const distPath = {
  css: 'assets/css',
  js: 'assets/js',
  svg: '_includes/components/svg'
}

const watchPaths = [
  'src/**/*.*',
  '_layouts/**/*.*',
  'collections/**/*.*'
]

watching = false;

function onError(err) {
  notify({
    title: 'Task failed',
    message: 'See the terminal for details.',
  });
  beeper();
  console.log(`
**************************************************
    ${err.filename} - ${err.line}:${err.col}.
    ------------------------------
    ${err.name}
    ${err.message}
**************************************************
  `);
  if (watching) {
    this.emit('end');
  } else {
    process.exit(1);
  }
}

function clean() {
  return del([
    'assets/css/*',
    'assets/js/*',
    '_includes/components/svg/',
    '_site'
  ])
};

// autoprefixer applies vendor prefixes based
// on browsers specified in .browserslistrc
function scssTask(){
  return src([srcPath.scss])
    .pipe(sourcemaps.init())
    .pipe(sassGlob())
    .pipe(sass().on('error', onError))
    .pipe(postcss([ autoprefixer(), cssnano() ]))
    .pipe(sourcemaps.write('.'))
    .pipe(dest(distPath.css));
}

function serve(done) {
  server.init({
    server: {
      baseDir: './_site/'
    }
  });
  done();
}

function reload(done) {
  server.reload();
  done();
}


// This task combines all files into a single minified file.
// If you have non-global JS files disable the concat() below.
function jsTask(){
  return src([srcPath.js]) // Can exclude files with ![filename]
    .pipe(uglify()).on('error', onError)
    .pipe(concat('scripts.min.js'))
    .pipe(dest(distPath.js)
  );
}

function svgTask() {
  return src([srcPath.svg])
    .pipe(dest(distPath.svg));
}

function spriteTask() {
  return src([srcPath.svg])
    .pipe(svgSymbols({
      id: 'icon-%f',
      templates: ['default-svg'],
      title: '%f',
      slug: function (name) {
        return name.toLowerCase().trim().replace(/\s/g, '-');
      }
    }))
    .pipe(dest(distPath.svg));
}

// Watch task: watch SCSS and JS files for changes
// If any change, run scss and js tasks simultaneously
function watchTask(){
  watching = true;
  watch(
    watchPaths,
    series(
      clean,
      parallel(scssTask, jsTask, svgTask, spriteTask),
      jekyllBuild,
      reload
    )
  );
}

function jekyllBuild(){
  return exec('bundle exec jekyll build');
}

// Export the default Gulp task so it can be run
// Runs the scss and js tasks simultaneously
// Then runs watch task
exports.default = series(
  parallel(scssTask, jsTask, svgTask, spriteTask),
  jekyllBuild,
  serve,
  watchTask
);

exports.styles = series(scssTask);
exports.scripts = series(jsTask);
exports.shapes = series(svgTask, spriteTask);
exports.compile = series(parallel(scssTask, jsTask, svgTask, spriteTask), jekyllBuild);
exports.jekyll = series(jekyllBuild);

exports.deploy = series(
  parallel(scssTask, jsTask, svgTask, spriteTask),
  jekyllBuild
)