unwrap = /^function\s*\(\)\s*\{([\s\S]*)\}/

fn = (f) ->
  unwrap.exec(f)?[1] or f

_not = (f) -> "!{#{fn f}}"
_and = (f) -> "&{#{fn f}}"
capitalize = (s) ->
  first = s.charAt 0
  "#{first.toUpperCase()}#{s[1..]}"

source = []
def = (name, args...) ->
  d = for a in args
    if Object::toString.call(a) is "[object Function]"
      "{#{fn a}}"
    else
      a
  source.push "#{name}\n  = #{d.join('\n    ')}"

defOr = (name, arr...) -> def name, arr.join(' / ')

List = (name, list, defFn) ->
  if typeof name is 'string'
    index = 0
    rootList = []
    if Array.isArray list
      for el in list
        if /^[a-zA-Z]+$/.exec el
          elName = "#{name}#{capitalize el}"
        else
          index++
          elName = "#{name}#{index}"
        rootList.push elName
        if defFn
          defFn elName, el, name, index
      defOr name, rootList...
    else if typeof list is 'string'
      defFn name, list, name, index
  else
    defFn = list
    Object.keys(name).forEach (key) ->
      List key, name[key], defFn

source.push """{#{
  fn ->
    linksLabels = {}
    protocolRx = /^[a-zA-Z]+:\/\//
    el = (name, content, attrs) ->
      content ?= null
      attrs ?= {}
      ret = {name, content, attrs}
      if name is 'link_label'
        linksLabels[ret.attrs.id.toLowerCase()] = ret.attrs
      ret

    join = (s) -> s.join('')

    parse = (text) ->
      res = Markdown.Parser.parse text
      for id, attrs of res.linksLabels
        linksLabels[id] = attrs
      res.elements
    return}
  }
  """

def 'start',
  'md:md*'
  -> {linksLabels, elements: md}

defOr 'md',
  "BlankLines"
  "CodeBlock"
  "BlockQuote"
  "BlockIndent"
  "Tag"
  "LinkLabel"
  "HorizontalRule"
  "ListOrdered"
  "ListUnordered"
  "HeaderSetext"
  "Header"
  "Paragraph"

def 'CodeBlock',
  'CodeBlockWrap'
  'lang:CodeBlockLang'
  'NewLine'
  'code:CodeBlockCode'
  'CodeBlockEnd'
  -> el 'code_block', code, {lang}

def 'CodeBlockLang',
  'Space*'
  'chars:(NonNewLine*)'
  -> join chars

def 'CodeBlockCode',
  'chars:(CodeBlockChar*)'
  -> join chars

def 'CodeBlockChar',
  '!CodeBlockEnd'
  'char:AnyChar'
  -> char

def 'CodeBlockEnd',
  'NewLine'
  'CodeBlockWrap'

def 'CodeBlockWrap', '"```"'

blocks =
  'BlockQuote': '">" SPACE_CHAR?'
  'BlockIndent': 'SPACE_CHAR SPACE_CHAR SPACE_CHAR SPACE_CHAR'

List blocks, (name, el, root) ->
  if name is 'BlockQuote'
    parse = 'parse'
    elName = 'blockquote'
  else
    parse = ''
    elName = 'indent_block'

  def "#{name}",
    "#{name}Start"
    "text:#{name}Text"
    "&#{name}End"
    "{return el('#{elName}', #{parse}(text));}"

  def "#{name}Text",
    "chars:(#{name}Char+)"
    -> join chars

  def "#{name}Char",
    "!#{name}End"
    "newline:(#{name}NewLine*)"
    'char:AnyChar'
    -> "#{join newline}#{char}"

  def "#{name}NewLine",
    'newline:NewLine'
    "#{name}Start"
    -> newline

  def "#{name}Start",
    el

  def "#{name}End",
    'DoubleNewLine / EOF'

List 'Tag', ['table', 'pre', 'div', 'p', 'dl'], (name, el) ->
  def name,
    "start:#{name}Start"
    "attrs:(TagAttributesChar*)"
    '">"'
    "text:(#{name}Char+)"
    "end:#{name}End"
    "{return el('tag_#{el}', join(start) + join(attrs) + '>' + join(text) + end);}"

  def "#{name}Char",
    "!(#{name}End / EOF)"
    "char:AnyChar"
    -> char

  def "#{name}Start",
    "\"<#{el}\""
    "Space*"

  def "#{name}End",
    "\"</#{el}>\""

def 'TagAttributesChar',
  '!">"'
  'char:AnyChar'
  -> char

def 'HorizontalRule',
  'line:HorizontalRuleLine'
  'NewLine'
  'Space*'
  '&NewLine'
  -> el 'horizontal_rule'

def 'HorizontalRuleLine',
  'hr1:HorizontalRuleCHAR'
  'hr2:HorizontalRuleCHAR'
  'hr3:HorizontalRuleCHAR'
  'HorizontalRuleCHAR*'
  _and -> hr1 == hr2 == hr3

def 'HorizontalRuleCHAR',
  'char:("*" / "-" / "_")'
  'Space*'
  -> char

lists =
  'ListOrdered': '([0-9]+) "." Space*'
  'ListUnordered': '("*" / "-" / "+") Space*'

List lists, (name, start) ->
  elName = if name is 'ListOrdered' then 'list_ordered' else 'list_unordered'
  
  def "#{name}",
    "items:(#{name}Item+)"
    "{return el('#{elName}', items);}"

  def "#{name}Item",
    "#{name}ItemStart"
    "chars:#{name}ItemChar+"
    "#{name}ItemEnd"
    -> el 'list_item', parse(join(chars))

  def "#{name}ItemChar",
    "!#{name}ItemEnd"
    "char:AnyChar"
    -> char

  def "#{name}ItemStart",
    "!(Emphasis1 / Strong1 / HorizontalRule)"
    start

  def "#{name}ItemEnd",
    "(NewLine &#{name}Item) / (NewLine BlankLine !BlockIndent) / EOF"

def 'HeaderSetext',
  'text:HeaderSetextText'
  'NewLine'
  'level:HeaderSetextLevel'
  '(DoubleNewLine / (NewLine EOF) / EOF)'
  -> el 'header', text, {level: (if level[0] is "=" then 1 else 2)}

def 'HeaderSetextText',
  'chars:(NonNewLine+)'
  -> join chars

def 'HeaderSetextLevel',
  '("=" / "-")+'

def 'Header',
  'level:HeaderStart'
  'Space*'
  'text:HeaderText'
  'HeaderEnd'
  -> el 'header', text, {level: level.length}

def 'HeaderText',
  'chars:(HeaderChar+)'
  -> join chars

def 'HeaderChar',
  '!HeaderEnd'
  'char:AnyChar'
  -> char

def 'HeaderStart',
  '"#"+'

def 'HeaderEnd',
  'Space*'
  '"#"*'
  'Space*'
  '(DoubleNewLine / EOF)'

def 'Paragraph',
  'text:(ParagraphInline / ParagraphText)+'
  -> el 'paragraph', text

def 'ParagraphText',
  'chars:(ParagraphChar+)'
  -> el 'text', join(chars)

def 'ParagraphChar',
  '!(ParagraphInline / DoubleNewLine / EOF)'
  'char:AnyChar'
  -> char

defOr 'ParagraphInline',
  'SimpleInline'
  'EmphasisIgnore'
  'Strong'
  'Emphasis'

defOr 'SimpleInline',
  'CodeInline1'
  'CodeInline2'
  'LinkImageInline'
  'LinkImageReference'
  'LinkInline'
  'LinkReference'
  'LinkInlineAuto'


List 'CodeInline', ["``", "`"], (name, el) ->
  def name,
    "#{name}Wrap"
    "text:(#{name}Char+)"
    "#{name}Wrap"
    -> el 'code_inline', join(text)

  def "#{name}Char",
    "!(#{name}Wrap / NewLine / EOF)"
    "char:AnyChar"
    -> char

  def "#{name}Wrap",
    "\"#{el}\""
    "!\"`\""

def 'LinkImageInline',
  '"!" link:LinkInline'
  -> el 'link_image', '', {src: link.attrs.href, title: link.attrs.title, alt: link.content}

def 'LinkImageReference',
  '"!" ref:LinkReference'
  -> el 'link_reference_image', '', {id: ref.attrs.id, title: ref.content}

def 'LinkInline',
  'LinkTextStart'
  'content:(LinkImageInline / LinkImageReference / LinkInlineText)'
  'LinkTextEnd'
  'Space*'
  'LinkInlineHrefStart'
  'href:(LinkInlineHrefChar+)'
  'Space*'
  'title:(LinkInlineTitle?)'
  'LinkInlineHrefEnd'
  -> el 'link_inline', content, {href: join(href), title: title}

def 'LinkInlineText',
  'chars:(LinkTextChar+)'
  -> el 'text', join chars

def 'LinkInlineTitle',
  '"\\""'
  'chars:(LinkInlineTitleChar*)'
  '"\\""'
  -> join chars

def 'LinkInlineTitleChar',
  '!("\\"" / LinkInlineHrefEnd)'
  'char:AnyChar'
  -> char

def 'LinkInlineHrefChar',
  '!(LinkInlineHrefEnd / Space / NewLine)'
  'char:AnyChar'
  -> char

def 'LinkInlineHrefStart', '"("'

def 'LinkInlineHrefEnd', '")"'

def 'LinkReference',
  'LinkTextStart'
  'text:(LinkTextChar+)'
  'LinkTextEnd'
  'Space*'
  'LinkTextStart'
  'id:(LinkTextChar*)'
  'LinkTextEnd'
  -> el 'link_reference', join(text), {id: join(id)}

def 'LinkLabel',
  'Space*'
  'LinkTextStart'
  'id:(LinkTextChar+)'
  'LinkTextEnd'
  '":"'
  'Space*'
  'href:(LinkLabelHrefChar+)'
  'Space*'
  'title:(LinkLabelTitle?)'
  'NewLine'
  -> el 'link_label', '', {href: join(href), title: title, id: join(id)}

def 'LinkLabelHrefChar',
  '!(Space / NewLine / EOF)'
  'char:AnyChar'
  -> char

def 'LinkLabelTitle',
  '"\\""'
  'chars:(LinkInlineTitleChar*)'
  '"\\""'
  -> join chars

def 'LinkLabelTitleChar',
  '!("\\"" / NewLine / EOF)'
  'char:AnyChar'
  -> char

def 'LinkTextChar',
  '!(LinkTextEnd / NewLine)'
  'char:AnyChar'
  -> char

def 'LinkTextStart',
  '"["'

def 'LinkTextEnd',
  '"]"'


def 'LinkInlineAuto',
  'LinkInlineAutoStart'
  'href:LinkInlineAutoLink'
  'LinkInlineAutoEnd'
  _and -> (href.charAt(href.length - 1) == "/") or (href.match(protocolRx))
  -> el 'link_inline_auto', href

def 'LinkInlineAutoLink',
  'chars:(LinkInlineAutoChar+)'
  -> join chars

def 'LinkInlineAutoChar',
  '!(LinkInlineAutoEnd / Space / NewLine / EOF)'
  'char:AnyChar'
  -> char

def 'LinkInlineAutoStart',
  '"<"'

def 'LinkInlineAutoEnd',
  '">"'

def 'EmphasisIgnore',
  '!"*"'
  'start:EmphasisIgnoreStart'
  'end:EmphasisIgnoreEnd'
  -> el 'text', start + end

def 'EmphasisIgnoreStart',
  '!EmphasisIgnoreEnd'
  'start:(EmphasisIgnoreStartPart+)'
  -> join start

def 'EmphasisIgnoreStartPart',
  'chars:(EmphasisIgnoreChar+)'
  '"_"'
  -> join(chars) + '_'

def 'EmphasisIgnoreEnd',
  'chars:(EmphasisIgnoreChar+)'
  '&("*" / Space / NewLine / EOF)'
  -> join chars

def "EmphasisIgnoreChar",
  '!("*" / "_" / ":" / ";" / "." / "," Space / NewLine / EOF)'
  'char:NonSpaceCHAR'
  -> char

List {'Strong':['**', '__'], 'Emphasis':['*', '_']}, (name, el, root, index) ->
  inline = if root is 'Strong' then 'Emphasis' else 'Strong'
  inlineIndex = if index == 1 then 2 else 1

  def name,
    "wrapStart:#{name}Start"
    "content:#{name}Content"
    "wrapEnd:#{name}End"
    "{return el('#{root.toLowerCase()}', content);}"

  def "#{name}Content",
    "&(#{name}Char+)"
    "inline:#{name}Inline+"
    -> inline

  def "#{name}Inline",
    "!#{root}"
    "inline:(EmphasisIgnore / #{inline}#{inlineIndex} / SimpleInline / #{name}Text)"
    -> inline

  def "#{name}Text",
    "chars:#{name}TextChar+"
    -> el 'text', join(chars)

  def "#{name}Start",
    "wrap:#{name}Wrap"
    "&NonSpace"
    -> wrap

  def "#{name}End",
    "wrap:#{name}Wrap"
    -> wrap

  def "#{name}TextChar",
    "!(EmphasisIgnore / #{inline}#{inlineIndex} / SimpleInline)"
    "char:#{name}Char"
    -> char

  def "#{name}Char",
    "!(#{name}Wrap / NewLine / EOF)"
    "char:AnyChar"
    -> char

  def "#{name}Wrap",
    "!#{name}NonWrap"
    "wrap:#{name}WrapChar"
    -> wrap

  def "#{name}NonWrap",
    '&Space'
    "#{name}WrapChar"
    '&Space'

  def "#{name}WrapChar",
    "\"#{el}\" !#{inline}#{index}Wrap"

def 'DoubleNewLine',
  'NewLine'
  'BlankLine'

def 'BlankLines',
  'BlankLine+'
  -> el 'blank'

def 'BlankLine',
  'Space*'
  'NewLine'
  -> el 'blank'

def 'NonSpace',
  'chars:(NonSpaceCHAR+)',
  -> join chars

def 'NonSpaceCHAR',
  '!SPACE_CHAR'
  'char:AnyChar'
  -> char

def 'Space',
  'SPACE_CHAR+'

def 'SPACE_CHAR',
  '[ \\t\\v\\f\\u00A0\\uFEFF\\u1680\\u180E\\u2000-\\u200A\\u202F\\u205F\\u3000]'

def 'NonNewLine',
  '!NewLine'
  'char:AnyChar'
  -> char

def 'NewLine',
  '"\\n" / "\\r\\n" / "\\r" / "\\u2028" / "\\u2029"'

def 'EOF','!.'
def 'AnyChar', '.'

module.exports = source.join('\n\n')
