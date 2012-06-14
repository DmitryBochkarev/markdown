var fs = require('fs'),
    util = require('util'),
    Markdown = require('../'),
    highlight = require('./highlight.js');

var test_file = fs.readFileSync(__dirname + '/test.md', 'utf-8');

var renders = {
  'code_block': function(el, done) {
    var code;
    if (el.attrs.lang && highlight.LANGUAGES[el.attrs.lang]) {
      code = highlight.highlight(el.attrs.lang, el.content).value;
    } else {
      code = highlight.highlightAuto(el.content).value;
    }
    done(this.callRender('_tag', 'pre', this.callRender('_tag', 'code', code, {lang: el.attrs.lang})));
  }
}

var md = Markdown(test_file, renders);
//console.log(util.inspect(md.elements, false, 20, true))
md.render(function(html) {
  page = [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<style>'+fs.readFileSync('./default.css', 'utf-8')+'</style>',
    '</head>',
    '<body>',
    html,
    '</body>',
    '</html>'
  ].join('');
  fs.writeFileSync('./index.html', page, 'utf-8');
});
