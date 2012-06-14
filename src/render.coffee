class Markdown
  constructor: (markdown, renders) ->
    return new Markdown(arguments...) unless this instanceof Markdown
    @renders = renders or {}
    @rendered = null
    {@elements, @linksLabels} = Markdown.Parser.parse(markdown)

  render: (done) ->
    if @elements.length
      @callRender '_elements', @elements, (html) =>
        done @rendered = html
    else
      done ''
    this

  callRender: (renderName, args...) ->
    render = @renders[renderName] or Markdown.renders[renderName] or -> throw new Error "Render not defined: #{renderName}"
    render.apply this, args
  
do (Markdown) ->

  Markdown.helpers = helpers =
    # Stealed from jquery
    scriptRx:  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi

    # Stealed from batman.js
    escapeHTML: do ->
      replacements =
        "&": "&amp;"
        "<": "&lt;"
        ">": "&gt;"
        "\"": "&#34;"
        "'": "&#39;"
      return (s) -> (""+s).replace(/[&<>'"]/g, (c) -> replacements[c])

    isArray: _isArray = Array.isArray or (obj) ->
      Object::toString.call(obj) == '[object Array]'

    forEachAsync: _forEachAsync = (arr, iterator, done) ->
      index = 0
      last = arr.length - 1
      result = []
      done(result) if last is -1
      next = (res) ->
        result.push res
        if index is last
          done result
        else
          index++
          iterator arr[index], next

      iterator arr[index], next

  Markdown.renders = renders =
    _attr: (key, val) -> "#{key}=\"#{val or ''}\""

    _attrs: (obj) ->
      res = for key, val of obj
        @callRender '_attr', key, val
      res.join ' '

    _tag: (name, content, attrs) ->
      if a = @callRender '_attrs', attrs
        a = " #{a}"
      if content.length
        "<#{name}#{a}>#{content}</#{name}>"
      else
        "<#{name}#{a}/>"

    _tagRender: (tag) ->
      return (el, done) -> @callRender '_element', tag, el, done

    _element: (tag, el, done) ->
      @callRender '_elements', el.content, (html) =>
        done @callRender '_tag', tag, html

    _elements: (arr, done) ->
      arr = [arr] unless _isArray arr
      iterator = (el, done) =>
        @callRender el.name, el, done
      _forEachAsync arr, iterator, (result) -> done result.join('')

    text: (el, done) -> done helpers.escapeHTML(el.content)
    blank: (el, done) -> done ''
    link_label: (el, done) -> done ''

    header: (el, done) ->
      tag = "h#{el.attrs.level}"
      done @callRender('_tag', tag, helpers.escapeHTML(el.content))

    horizontal_rule: (el, done) -> done "<hr/>"

    indent_block: (el, done) ->
      @callRender 'code_block', el, done

    code_block: (el, done) ->
      lang = el.attrs.lang or null
      done @callRender('_tag', 'pre', @callRender('_tag', 'code', helpers.escapeHTML(el.content), {class: lang}))

    code_inline: (el, done) ->
      done @callRender('_tag', 'span', helpers.escapeHTML(el.content), {class: 'code'})

    link_inline: (el, done) ->
      @callRender '_elements', el.content, (html) =>
        href = el.attrs.href
        title = el.attrs.title
        done @callRender('_tag', 'a', html, {href, title})

    link_image: (el, done) ->
      src = el.attrs.src
      alt = el.attrs.alt
      title = el.attrs.title
      done @callRender('_tag', 'img', '', {src, alt, title})

    link_reference: (el, done) ->
      labelId = el.attrs.id.toLowerCase() or el.content.toLowerCase()
      label = @linksLabels[el.attrs.id.toLowerCase() or el.content.toLowerCase()]
      if label
        el.attrs.href = label.href
        el.attrs.title = label.title
        @callRender 'link_inline', el, done
      else
        done "[Link label for id '#{labelId}' not defined]"

    link_reference_image: (el, done) ->
      labelId = el.attrs.id.toLowerCase() or el.attrs.title.toLowerCase()
      label = @linksLabels[labelId]
      if label
        el.attrs.src = label.href
        el.attrs.alt = label.title
        @callRender 'link_image', el, done
      else
        done "[Link label for id '#{labelId}' not defined]"

    link_inline_auto: (el, done) ->
      done @callRender('_tag', 'a', el.content, {href: el.content})

  renders.paragraph = renders._tagRender 'p'
  renders.list_ordered = renders._tagRender 'ol'
  renders.list_unordered = renders._tagRender 'ul'
  renders.list_item = renders._tagRender 'li'
  renders.strong = renders._tagRender 'strong'
  renders.emphasis = renders._tagRender 'em'
  renders.blockquote = renders._tagRender 'blockquote'

  for tag in ['table', 'p', 'pre', 'dl', 'div']
    renders["tag_#{tag}"] = (el, done) -> done el.content.replace(Markdown.helpers.scriptRx, '')
    return

  return
