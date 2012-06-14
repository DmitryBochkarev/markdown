path = require 'path'
fs = require 'fs' 
PEG = require 'pegjs'
CoffeeScript = require 'coffee-script'
readFile = (filename) -> fs.readFileSync filename, 'utf-8'
writeFile = (filename, content) -> fs.writeFileSync filename, content
renderFilename = path.resolve __dirname, 'src', 'render.coffee'
parserSourceFilename = path.resolve __dirname, 'src', 'lexer.coffee'
markdownFilename = path.resolve __dirname, 'markdown.js'
markdownCompressedFilename = path.resolve __dirname, 'markdown.min.js'

task 'build', (options, cb) ->
  invoke 'compile'
  invoke 'minify'

task 'compile', (options, cb) ->
  renderSource = readFile renderFilename

  render = CoffeeScript.compile(renderSource, {bare: true});

  parserSource = require parserSourceFilename

  parser = PEG.buildParser(parserSource).toSource()

  markdown = """
    (function() {
    #{render}
    Markdown.Parser = #{parser};
    var root = this;
    if (typeof exports !== 'undefined') {
      if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = Markdown;
      }
      exports.Markdown = Markdown;
    } else {
      root['Markdown'] = Markdown;
      if (typeof define === 'function') {
        define('markdown', [], function () {return Markdown;});
      }
    }
    }).call(this);
    """

  writeFile markdownFilename, markdown

task 'minify', (options, cb) ->
  jsp = require("uglify-js").parser
  pro = require("uglify-js").uglify

  ast = jsp.parse readFile markdownFilename
  ast = pro.ast_mangle(ast)
  ast = pro.ast_squeeze(ast)
  min = pro.gen_code(ast)

  writeFile markdownCompressedFilename, min

