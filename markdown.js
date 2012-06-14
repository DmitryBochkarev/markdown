(function() {
var Markdown,
  __slice = [].slice;

Markdown = (function() {

  function Markdown(markdown, renders) {
    var _ref;
    if (!(this instanceof Markdown)) {
      return (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args), t = typeof result;
        return t == "object" || t == "function" ? result || child : child;
      })(Markdown, arguments, function(){});
    }
    this.renders = renders || {};
    this.rendered = null;
    _ref = Markdown.Parser.parse(markdown), this.elements = _ref.elements, this.linksLabels = _ref.linksLabels;
  }

  Markdown.prototype.render = function(done) {
    var _this = this;
    if (this.elements.length) {
      this.callRender('_elements', this.elements, function(html) {
        return done(_this.rendered = html);
      });
    } else {
      done('');
    }
    return this;
  };

  Markdown.prototype.callRender = function() {
    var args, render, renderName;
    renderName = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    render = this.renders[renderName] || Markdown.renders[renderName] || function() {
      throw new Error("Render not defined: " + renderName);
    };
    return render.apply(this, args);
  };

  return Markdown;

})();

(function(Markdown) {
  var helpers, renders, tag, _forEachAsync, _i, _isArray, _len, _ref;
  Markdown.helpers = helpers = {
    scriptRx: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    escapeHTML: (function() {
      var replacements;
      replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&#34;",
        "'": "&#39;"
      };
      return function(s) {
        return ("" + s).replace(/[&<>'"]/g, function(c) {
          return replacements[c];
        });
      };
    })(),
    isArray: _isArray = Array.isArray || function(obj) {
      return Object.prototype.toString.call(obj) === '[object Array]';
    },
    forEachAsync: _forEachAsync = function(arr, iterator, done) {
      var index, last, next, result;
      index = 0;
      last = arr.length - 1;
      result = [];
      if (last === -1) {
        done(result);
      }
      next = function(res) {
        result.push(res);
        if (index === last) {
          return done(result);
        } else {
          index++;
          return iterator(arr[index], next);
        }
      };
      return iterator(arr[index], next);
    }
  };
  Markdown.renders = renders = {
    _attr: function(key, val) {
      return "" + key + "=\"" + (val || '') + "\"";
    },
    _attrs: function(obj) {
      var key, res, val;
      res = (function() {
        var _results;
        _results = [];
        for (key in obj) {
          val = obj[key];
          _results.push(this.callRender('_attr', key, val));
        }
        return _results;
      }).call(this);
      return res.join(' ');
    },
    _tag: function(name, content, attrs) {
      var a;
      if (a = this.callRender('_attrs', attrs)) {
        a = " " + a;
      }
      if (content.length) {
        return "<" + name + a + ">" + content + "</" + name + ">";
      } else {
        return "<" + name + a + "/>";
      }
    },
    _tagRender: function(tag) {
      return function(el, done) {
        return this.callRender('_element', tag, el, done);
      };
    },
    _element: function(tag, el, done) {
      var _this = this;
      return this.callRender('_elements', el.content, function(html) {
        return done(_this.callRender('_tag', tag, html));
      });
    },
    _elements: function(arr, done) {
      var iterator,
        _this = this;
      if (!_isArray(arr)) {
        arr = [arr];
      }
      iterator = function(el, done) {
        return _this.callRender(el.name, el, done);
      };
      return _forEachAsync(arr, iterator, function(result) {
        return done(result.join(''));
      });
    },
    text: function(el, done) {
      return done(helpers.escapeHTML(el.content));
    },
    blank: function(el, done) {
      return done('');
    },
    link_label: function(el, done) {
      return done('');
    },
    header: function(el, done) {
      var tag;
      tag = "h" + el.attrs.level;
      return done(this.callRender('_tag', tag, helpers.escapeHTML(el.content)));
    },
    horizontal_rule: function(el, done) {
      return done("<hr/>");
    },
    indent_block: function(el, done) {
      return this.callRender('code_block', el, done);
    },
    code_block: function(el, done) {
      var lang;
      lang = el.attrs.lang || null;
      return done(this.callRender('_tag', 'pre', this.callRender('_tag', 'code', helpers.escapeHTML(el.content), {
        "class": lang
      })));
    },
    code_inline: function(el, done) {
      return done(this.callRender('_tag', 'span', helpers.escapeHTML(el.content), {
        "class": 'code'
      }));
    },
    link_inline: function(el, done) {
      var _this = this;
      return this.callRender('_elements', el.content, function(html) {
        var href, title;
        href = el.attrs.href;
        title = el.attrs.title;
        return done(_this.callRender('_tag', 'a', html, {
          href: href,
          title: title
        }));
      });
    },
    link_image: function(el, done) {
      var alt, src, title;
      src = el.attrs.src;
      alt = el.attrs.alt;
      title = el.attrs.title;
      return done(this.callRender('_tag', 'img', '', {
        src: src,
        alt: alt,
        title: title
      }));
    },
    link_reference: function(el, done) {
      var label, labelId;
      labelId = el.attrs.id.toLowerCase() || el.content.toLowerCase();
      label = this.linksLabels[el.attrs.id.toLowerCase() || el.content.toLowerCase()];
      if (label) {
        el.attrs.href = label.href;
        el.attrs.title = label.title;
        return this.callRender('link_inline', el, done);
      } else {
        return done("[Link label for id '" + labelId + "' not defined]");
      }
    },
    link_reference_image: function(el, done) {
      var label, labelId;
      labelId = el.attrs.id.toLowerCase() || el.attrs.title.toLowerCase();
      label = this.linksLabels[labelId];
      if (label) {
        el.attrs.src = label.href;
        el.attrs.alt = label.title;
        return this.callRender('link_image', el, done);
      } else {
        return done("[Link label for id '" + labelId + "' not defined]");
      }
    },
    link_inline_auto: function(el, done) {
      return done(this.callRender('_tag', 'a', el.content, {
        href: el.content
      }));
    }
  };
  renders.paragraph = renders._tagRender('p');
  renders.list_ordered = renders._tagRender('ol');
  renders.list_unordered = renders._tagRender('ul');
  renders.list_item = renders._tagRender('li');
  renders.strong = renders._tagRender('strong');
  renders.emphasis = renders._tagRender('em');
  renders.blockquote = renders._tagRender('blockquote');
  _ref = ['table', 'p', 'pre', 'dl', 'div'];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    tag = _ref[_i];
    renders["tag_" + tag] = function(el, done) {
      return done(el.content.replace(Markdown.helpers.scriptRx, ''));
    };
    return;
  }
})(Markdown);

Markdown.Parser = (function(){
  /*
   * Generated by PEG.js 0.7.0.
   *
   * http://pegjs.majda.cz/
   */
  
  function quote(s) {
    /*
     * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a
     * string literal except for the closing quote character, backslash,
     * carriage return, line separator, paragraph separator, and line feed.
     * Any character may appear in the form of an escape sequence.
     *
     * For portability, we also escape escape all control and non-ASCII
     * characters. Note that "\0" and "\v" escape sequences are not used
     * because JSHint does not like the first and IE the second.
     */
     return '"' + s
      .replace(/\\/g, '\\\\')  // backslash
      .replace(/"/g, '\\"')    // closing quote character
      .replace(/\x08/g, '\\b') // backspace
      .replace(/\t/g, '\\t')   // horizontal tab
      .replace(/\n/g, '\\n')   // line feed
      .replace(/\f/g, '\\f')   // form feed
      .replace(/\r/g, '\\r')   // carriage return
      .replace(/[\x00-\x07\x0B\x0E-\x1F\x80-\uFFFF]/g, escape)
      + '"';
  }
  
  var result = {
    /*
     * Parses the input with a generated parser. If the parsing is successfull,
     * returns a value explicitly or implicitly specified by the grammar from
     * which the parser was generated (see |PEG.buildParser|). If the parsing is
     * unsuccessful, throws |PEG.parser.SyntaxError| describing the error.
     */
    parse: function(input, startRule) {
      var parseFunctions = {
        "start": parse_start,
        "md": parse_md,
        "CodeBlock": parse_CodeBlock,
        "CodeBlockLang": parse_CodeBlockLang,
        "CodeBlockCode": parse_CodeBlockCode,
        "CodeBlockChar": parse_CodeBlockChar,
        "CodeBlockEnd": parse_CodeBlockEnd,
        "CodeBlockWrap": parse_CodeBlockWrap,
        "BlockQuote": parse_BlockQuote,
        "BlockQuoteText": parse_BlockQuoteText,
        "BlockQuoteChar": parse_BlockQuoteChar,
        "BlockQuoteNewLine": parse_BlockQuoteNewLine,
        "BlockQuoteStart": parse_BlockQuoteStart,
        "BlockQuoteEnd": parse_BlockQuoteEnd,
        "BlockIndent": parse_BlockIndent,
        "BlockIndentText": parse_BlockIndentText,
        "BlockIndentChar": parse_BlockIndentChar,
        "BlockIndentNewLine": parse_BlockIndentNewLine,
        "BlockIndentStart": parse_BlockIndentStart,
        "BlockIndentEnd": parse_BlockIndentEnd,
        "TagTable": parse_TagTable,
        "TagTableChar": parse_TagTableChar,
        "TagTableStart": parse_TagTableStart,
        "TagTableEnd": parse_TagTableEnd,
        "TagPre": parse_TagPre,
        "TagPreChar": parse_TagPreChar,
        "TagPreStart": parse_TagPreStart,
        "TagPreEnd": parse_TagPreEnd,
        "TagDiv": parse_TagDiv,
        "TagDivChar": parse_TagDivChar,
        "TagDivStart": parse_TagDivStart,
        "TagDivEnd": parse_TagDivEnd,
        "TagP": parse_TagP,
        "TagPChar": parse_TagPChar,
        "TagPStart": parse_TagPStart,
        "TagPEnd": parse_TagPEnd,
        "TagDl": parse_TagDl,
        "TagDlChar": parse_TagDlChar,
        "TagDlStart": parse_TagDlStart,
        "TagDlEnd": parse_TagDlEnd,
        "Tag": parse_Tag,
        "TagAttributesChar": parse_TagAttributesChar,
        "HorizontalRule": parse_HorizontalRule,
        "HorizontalRuleLine": parse_HorizontalRuleLine,
        "HorizontalRuleCHAR": parse_HorizontalRuleCHAR,
        "ListOrdered": parse_ListOrdered,
        "ListOrderedItem": parse_ListOrderedItem,
        "ListOrderedItemChar": parse_ListOrderedItemChar,
        "ListOrderedItemStart": parse_ListOrderedItemStart,
        "ListOrderedItemEnd": parse_ListOrderedItemEnd,
        "ListUnordered": parse_ListUnordered,
        "ListUnorderedItem": parse_ListUnorderedItem,
        "ListUnorderedItemChar": parse_ListUnorderedItemChar,
        "ListUnorderedItemStart": parse_ListUnorderedItemStart,
        "ListUnorderedItemEnd": parse_ListUnorderedItemEnd,
        "HeaderSetext": parse_HeaderSetext,
        "HeaderSetextText": parse_HeaderSetextText,
        "HeaderSetextLevel": parse_HeaderSetextLevel,
        "Header": parse_Header,
        "HeaderText": parse_HeaderText,
        "HeaderChar": parse_HeaderChar,
        "HeaderStart": parse_HeaderStart,
        "HeaderEnd": parse_HeaderEnd,
        "Paragraph": parse_Paragraph,
        "ParagraphText": parse_ParagraphText,
        "ParagraphChar": parse_ParagraphChar,
        "ParagraphInline": parse_ParagraphInline,
        "SimpleInline": parse_SimpleInline,
        "CodeInline1": parse_CodeInline1,
        "CodeInline1Char": parse_CodeInline1Char,
        "CodeInline1Wrap": parse_CodeInline1Wrap,
        "CodeInline2": parse_CodeInline2,
        "CodeInline2Char": parse_CodeInline2Char,
        "CodeInline2Wrap": parse_CodeInline2Wrap,
        "CodeInline": parse_CodeInline,
        "LinkImageInline": parse_LinkImageInline,
        "LinkImageReference": parse_LinkImageReference,
        "LinkInline": parse_LinkInline,
        "LinkInlineText": parse_LinkInlineText,
        "LinkInlineTitle": parse_LinkInlineTitle,
        "LinkInlineTitleChar": parse_LinkInlineTitleChar,
        "LinkInlineHrefChar": parse_LinkInlineHrefChar,
        "LinkInlineHrefStart": parse_LinkInlineHrefStart,
        "LinkInlineHrefEnd": parse_LinkInlineHrefEnd,
        "LinkReference": parse_LinkReference,
        "LinkLabel": parse_LinkLabel,
        "LinkLabelHrefChar": parse_LinkLabelHrefChar,
        "LinkLabelTitle": parse_LinkLabelTitle,
        "LinkLabelTitleChar": parse_LinkLabelTitleChar,
        "LinkTextChar": parse_LinkTextChar,
        "LinkTextStart": parse_LinkTextStart,
        "LinkTextEnd": parse_LinkTextEnd,
        "LinkInlineAuto": parse_LinkInlineAuto,
        "LinkInlineAutoLink": parse_LinkInlineAutoLink,
        "LinkInlineAutoChar": parse_LinkInlineAutoChar,
        "LinkInlineAutoStart": parse_LinkInlineAutoStart,
        "LinkInlineAutoEnd": parse_LinkInlineAutoEnd,
        "EmphasisIgnore": parse_EmphasisIgnore,
        "EmphasisIgnoreStart": parse_EmphasisIgnoreStart,
        "EmphasisIgnoreStartPart": parse_EmphasisIgnoreStartPart,
        "EmphasisIgnoreEnd": parse_EmphasisIgnoreEnd,
        "EmphasisIgnoreChar": parse_EmphasisIgnoreChar,
        "Strong1": parse_Strong1,
        "Strong1Content": parse_Strong1Content,
        "Strong1Inline": parse_Strong1Inline,
        "Strong1Text": parse_Strong1Text,
        "Strong1Start": parse_Strong1Start,
        "Strong1End": parse_Strong1End,
        "Strong1TextChar": parse_Strong1TextChar,
        "Strong1Char": parse_Strong1Char,
        "Strong1Wrap": parse_Strong1Wrap,
        "Strong1NonWrap": parse_Strong1NonWrap,
        "Strong1WrapChar": parse_Strong1WrapChar,
        "Strong2": parse_Strong2,
        "Strong2Content": parse_Strong2Content,
        "Strong2Inline": parse_Strong2Inline,
        "Strong2Text": parse_Strong2Text,
        "Strong2Start": parse_Strong2Start,
        "Strong2End": parse_Strong2End,
        "Strong2TextChar": parse_Strong2TextChar,
        "Strong2Char": parse_Strong2Char,
        "Strong2Wrap": parse_Strong2Wrap,
        "Strong2NonWrap": parse_Strong2NonWrap,
        "Strong2WrapChar": parse_Strong2WrapChar,
        "Strong": parse_Strong,
        "Emphasis1": parse_Emphasis1,
        "Emphasis1Content": parse_Emphasis1Content,
        "Emphasis1Inline": parse_Emphasis1Inline,
        "Emphasis1Text": parse_Emphasis1Text,
        "Emphasis1Start": parse_Emphasis1Start,
        "Emphasis1End": parse_Emphasis1End,
        "Emphasis1TextChar": parse_Emphasis1TextChar,
        "Emphasis1Char": parse_Emphasis1Char,
        "Emphasis1Wrap": parse_Emphasis1Wrap,
        "Emphasis1NonWrap": parse_Emphasis1NonWrap,
        "Emphasis1WrapChar": parse_Emphasis1WrapChar,
        "Emphasis2": parse_Emphasis2,
        "Emphasis2Content": parse_Emphasis2Content,
        "Emphasis2Inline": parse_Emphasis2Inline,
        "Emphasis2Text": parse_Emphasis2Text,
        "Emphasis2Start": parse_Emphasis2Start,
        "Emphasis2End": parse_Emphasis2End,
        "Emphasis2TextChar": parse_Emphasis2TextChar,
        "Emphasis2Char": parse_Emphasis2Char,
        "Emphasis2Wrap": parse_Emphasis2Wrap,
        "Emphasis2NonWrap": parse_Emphasis2NonWrap,
        "Emphasis2WrapChar": parse_Emphasis2WrapChar,
        "Emphasis": parse_Emphasis,
        "DoubleNewLine": parse_DoubleNewLine,
        "BlankLines": parse_BlankLines,
        "BlankLine": parse_BlankLine,
        "NonSpace": parse_NonSpace,
        "NonSpaceCHAR": parse_NonSpaceCHAR,
        "Space": parse_Space,
        "SPACE_CHAR": parse_SPACE_CHAR,
        "NonNewLine": parse_NonNewLine,
        "NewLine": parse_NewLine,
        "EOF": parse_EOF,
        "AnyChar": parse_AnyChar
      };
      
      if (startRule !== undefined) {
        if (parseFunctions[startRule] === undefined) {
          throw new Error("Invalid rule name: " + quote(startRule) + ".");
        }
      } else {
        startRule = "start";
      }
      
      var pos = 0;
      var reportFailures = 0;
      var rightmostFailuresPos = 0;
      var rightmostFailuresExpected = [];
      
      function padLeft(input, padding, length) {
        var result = input;
        
        var padLength = length - input.length;
        for (var i = 0; i < padLength; i++) {
          result = padding + result;
        }
        
        return result;
      }
      
      function escape(ch) {
        var charCode = ch.charCodeAt(0);
        var escapeChar;
        var length;
        
        if (charCode <= 0xFF) {
          escapeChar = 'x';
          length = 2;
        } else {
          escapeChar = 'u';
          length = 4;
        }
        
        return '\\' + escapeChar + padLeft(charCode.toString(16).toUpperCase(), '0', length);
      }
      
      function matchFailed(failure) {
        if (pos < rightmostFailuresPos) {
          return;
        }
        
        if (pos > rightmostFailuresPos) {
          rightmostFailuresPos = pos;
          rightmostFailuresExpected = [];
        }
        
        rightmostFailuresExpected.push(failure);
      }
      
      function parse_start() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result0 = [];
        result1 = parse_md();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_md();
        }
        if (result0 !== null) {
          result0 = (function(offset, md) {
            return {
              linksLabels: linksLabels,
              elements: md
            };
          })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_md() {
        var result0;
        
        result0 = parse_BlankLines();
        if (result0 === null) {
          result0 = parse_CodeBlock();
          if (result0 === null) {
            result0 = parse_BlockQuote();
            if (result0 === null) {
              result0 = parse_BlockIndent();
              if (result0 === null) {
                result0 = parse_Tag();
                if (result0 === null) {
                  result0 = parse_LinkLabel();
                  if (result0 === null) {
                    result0 = parse_HorizontalRule();
                    if (result0 === null) {
                      result0 = parse_ListOrdered();
                      if (result0 === null) {
                        result0 = parse_ListUnordered();
                        if (result0 === null) {
                          result0 = parse_HeaderSetext();
                          if (result0 === null) {
                            result0 = parse_Header();
                            if (result0 === null) {
                              result0 = parse_Paragraph();
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_CodeBlock() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_CodeBlockWrap();
        if (result0 !== null) {
          result1 = parse_CodeBlockLang();
          if (result1 !== null) {
            result2 = parse_NewLine();
            if (result2 !== null) {
              result3 = parse_CodeBlockCode();
              if (result3 !== null) {
                result4 = parse_CodeBlockEnd();
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, lang, code) {
            return el('code_block', code, {
              lang: lang
            });
          })(pos0, result0[1], result0[3]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_CodeBlockLang() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = [];
        result1 = parse_Space();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_Space();
        }
        if (result0 !== null) {
          result1 = [];
          result2 = parse_NonNewLine();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_NonNewLine();
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
            return join(chars);
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_CodeBlockCode() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result0 = [];
        result1 = parse_CodeBlockChar();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_CodeBlockChar();
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
            return join(chars);
          })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_CodeBlockChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_CodeBlockEnd();
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
            return char;
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_CodeBlockEnd() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result0 = parse_NewLine();
        if (result0 !== null) {
          result1 = parse_CodeBlockWrap();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_CodeBlockWrap() {
        var result0;
        
        if (input.substr(pos, 3) === "```") {
          result0 = "```";
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"```\"");
          }
        }
        return result0;
      }
      
      function parse_BlockQuote() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_BlockQuoteStart();
        if (result0 !== null) {
          result1 = parse_BlockQuoteText();
          if (result1 !== null) {
            pos2 = pos;
            reportFailures++;
            result2 = parse_BlockQuoteEnd();
            reportFailures--;
            if (result2 !== null) {
              result2 = "";
              pos = pos2;
            } else {
              result2 = null;
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, text) {return el('blockquote', parse(text));})(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_BlockQuoteText() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_BlockQuoteChar();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_BlockQuoteChar();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
              return join(chars);
            })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_BlockQuoteChar() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_BlockQuoteEnd();
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = [];
          result2 = parse_BlockQuoteNewLine();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_BlockQuoteNewLine();
          }
          if (result1 !== null) {
            result2 = parse_AnyChar();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, newline, char) {
              return "" + (join(newline)) + char;
            })(pos0, result0[1], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_BlockQuoteNewLine() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_NewLine();
        if (result0 !== null) {
          result1 = parse_BlockQuoteStart();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, newline) {
              return newline;
            })(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_BlockQuoteStart() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        if (input.charCodeAt(pos) === 62) {
          result0 = ">";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\">\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_SPACE_CHAR();
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_BlockQuoteEnd() {
        var result0;
        
        result0 = parse_DoubleNewLine();
        if (result0 === null) {
          result0 = parse_EOF();
        }
        return result0;
      }
      
      function parse_BlockIndent() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_BlockIndentStart();
        if (result0 !== null) {
          result1 = parse_BlockIndentText();
          if (result1 !== null) {
            pos2 = pos;
            reportFailures++;
            result2 = parse_BlockIndentEnd();
            reportFailures--;
            if (result2 !== null) {
              result2 = "";
              pos = pos2;
            } else {
              result2 = null;
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, text) {return el('indent_block', (text));})(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_BlockIndentText() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_BlockIndentChar();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_BlockIndentChar();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
              return join(chars);
            })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_BlockIndentChar() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_BlockIndentEnd();
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = [];
          result2 = parse_BlockIndentNewLine();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_BlockIndentNewLine();
          }
          if (result1 !== null) {
            result2 = parse_AnyChar();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, newline, char) {
              return "" + (join(newline)) + char;
            })(pos0, result0[1], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_BlockIndentNewLine() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_NewLine();
        if (result0 !== null) {
          result1 = parse_BlockIndentStart();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, newline) {
              return newline;
            })(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_BlockIndentStart() {
        var result0, result1, result2, result3;
        var pos0;
        
        pos0 = pos;
        result0 = parse_SPACE_CHAR();
        if (result0 !== null) {
          result1 = parse_SPACE_CHAR();
          if (result1 !== null) {
            result2 = parse_SPACE_CHAR();
            if (result2 !== null) {
              result3 = parse_SPACE_CHAR();
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_BlockIndentEnd() {
        var result0;
        
        result0 = parse_DoubleNewLine();
        if (result0 === null) {
          result0 = parse_EOF();
        }
        return result0;
      }
      
      function parse_TagTable() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_TagTableStart();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_TagAttributesChar();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_TagAttributesChar();
          }
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 62) {
              result2 = ">";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\">\"");
              }
            }
            if (result2 !== null) {
              result4 = parse_TagTableChar();
              if (result4 !== null) {
                result3 = [];
                while (result4 !== null) {
                  result3.push(result4);
                  result4 = parse_TagTableChar();
                }
              } else {
                result3 = null;
              }
              if (result3 !== null) {
                result4 = parse_TagTableEnd();
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, start, attrs, text, end) {return el('tag_table', join(start) + join(attrs) + '>' + join(text) + end);})(pos0, result0[0], result0[1], result0[3], result0[4]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_TagTableChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_TagTableEnd();
        if (result0 === null) {
          result0 = parse_EOF();
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
              return char;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_TagTableStart() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 6) === "<table") {
          result0 = "<table";
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"<table\"");
          }
        }
        if (result0 !== null) {
          result1 = [];
          result2 = parse_Space();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_Space();
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_TagTableEnd() {
        var result0;
        
        if (input.substr(pos, 8) === "</table>") {
          result0 = "</table>";
          pos += 8;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"</table>\"");
          }
        }
        return result0;
      }
      
      function parse_TagPre() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_TagPreStart();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_TagAttributesChar();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_TagAttributesChar();
          }
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 62) {
              result2 = ">";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\">\"");
              }
            }
            if (result2 !== null) {
              result4 = parse_TagPreChar();
              if (result4 !== null) {
                result3 = [];
                while (result4 !== null) {
                  result3.push(result4);
                  result4 = parse_TagPreChar();
                }
              } else {
                result3 = null;
              }
              if (result3 !== null) {
                result4 = parse_TagPreEnd();
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, start, attrs, text, end) {return el('tag_pre', join(start) + join(attrs) + '>' + join(text) + end);})(pos0, result0[0], result0[1], result0[3], result0[4]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_TagPreChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_TagPreEnd();
        if (result0 === null) {
          result0 = parse_EOF();
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
              return char;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_TagPreStart() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 4) === "<pre") {
          result0 = "<pre";
          pos += 4;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"<pre\"");
          }
        }
        if (result0 !== null) {
          result1 = [];
          result2 = parse_Space();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_Space();
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_TagPreEnd() {
        var result0;
        
        if (input.substr(pos, 6) === "</pre>") {
          result0 = "</pre>";
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"</pre>\"");
          }
        }
        return result0;
      }
      
      function parse_TagDiv() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_TagDivStart();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_TagAttributesChar();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_TagAttributesChar();
          }
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 62) {
              result2 = ">";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\">\"");
              }
            }
            if (result2 !== null) {
              result4 = parse_TagDivChar();
              if (result4 !== null) {
                result3 = [];
                while (result4 !== null) {
                  result3.push(result4);
                  result4 = parse_TagDivChar();
                }
              } else {
                result3 = null;
              }
              if (result3 !== null) {
                result4 = parse_TagDivEnd();
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, start, attrs, text, end) {return el('tag_div', join(start) + join(attrs) + '>' + join(text) + end);})(pos0, result0[0], result0[1], result0[3], result0[4]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_TagDivChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_TagDivEnd();
        if (result0 === null) {
          result0 = parse_EOF();
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
              return char;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_TagDivStart() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 4) === "<div") {
          result0 = "<div";
          pos += 4;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"<div\"");
          }
        }
        if (result0 !== null) {
          result1 = [];
          result2 = parse_Space();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_Space();
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_TagDivEnd() {
        var result0;
        
        if (input.substr(pos, 6) === "</div>") {
          result0 = "</div>";
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"</div>\"");
          }
        }
        return result0;
      }
      
      function parse_TagP() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_TagPStart();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_TagAttributesChar();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_TagAttributesChar();
          }
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 62) {
              result2 = ">";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\">\"");
              }
            }
            if (result2 !== null) {
              result4 = parse_TagPChar();
              if (result4 !== null) {
                result3 = [];
                while (result4 !== null) {
                  result3.push(result4);
                  result4 = parse_TagPChar();
                }
              } else {
                result3 = null;
              }
              if (result3 !== null) {
                result4 = parse_TagPEnd();
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, start, attrs, text, end) {return el('tag_p', join(start) + join(attrs) + '>' + join(text) + end);})(pos0, result0[0], result0[1], result0[3], result0[4]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_TagPChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_TagPEnd();
        if (result0 === null) {
          result0 = parse_EOF();
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
              return char;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_TagPStart() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 2) === "<p") {
          result0 = "<p";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"<p\"");
          }
        }
        if (result0 !== null) {
          result1 = [];
          result2 = parse_Space();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_Space();
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_TagPEnd() {
        var result0;
        
        if (input.substr(pos, 4) === "</p>") {
          result0 = "</p>";
          pos += 4;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"</p>\"");
          }
        }
        return result0;
      }
      
      function parse_TagDl() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_TagDlStart();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_TagAttributesChar();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_TagAttributesChar();
          }
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 62) {
              result2 = ">";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\">\"");
              }
            }
            if (result2 !== null) {
              result4 = parse_TagDlChar();
              if (result4 !== null) {
                result3 = [];
                while (result4 !== null) {
                  result3.push(result4);
                  result4 = parse_TagDlChar();
                }
              } else {
                result3 = null;
              }
              if (result3 !== null) {
                result4 = parse_TagDlEnd();
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, start, attrs, text, end) {return el('tag_dl', join(start) + join(attrs) + '>' + join(text) + end);})(pos0, result0[0], result0[1], result0[3], result0[4]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_TagDlChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_TagDlEnd();
        if (result0 === null) {
          result0 = parse_EOF();
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
              return char;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_TagDlStart() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 3) === "<dl") {
          result0 = "<dl";
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"<dl\"");
          }
        }
        if (result0 !== null) {
          result1 = [];
          result2 = parse_Space();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_Space();
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_TagDlEnd() {
        var result0;
        
        if (input.substr(pos, 5) === "</dl>") {
          result0 = "</dl>";
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"</dl>\"");
          }
        }
        return result0;
      }
      
      function parse_Tag() {
        var result0;
        
        result0 = parse_TagTable();
        if (result0 === null) {
          result0 = parse_TagPre();
          if (result0 === null) {
            result0 = parse_TagDiv();
            if (result0 === null) {
              result0 = parse_TagP();
              if (result0 === null) {
                result0 = parse_TagDl();
              }
            }
          }
        }
        return result0;
      }
      
      function parse_TagAttributesChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        if (input.charCodeAt(pos) === 62) {
          result0 = ">";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\">\"");
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
            return char;
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_HorizontalRule() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_HorizontalRuleLine();
        if (result0 !== null) {
          result1 = parse_NewLine();
          if (result1 !== null) {
            result2 = [];
            result3 = parse_Space();
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse_Space();
            }
            if (result2 !== null) {
              pos2 = pos;
              reportFailures++;
              result3 = parse_NewLine();
              reportFailures--;
              if (result3 !== null) {
                result3 = "";
                pos = pos2;
              } else {
                result3 = null;
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, line) {
            return el('horizontal_rule');
          })(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_HorizontalRuleLine() {
        var result0, result1, result2, result3, result4;
        var pos0;
        
        pos0 = pos;
        result0 = parse_HorizontalRuleCHAR();
        if (result0 !== null) {
          result1 = parse_HorizontalRuleCHAR();
          if (result1 !== null) {
            result2 = parse_HorizontalRuleCHAR();
            if (result2 !== null) {
              result3 = [];
              result4 = parse_HorizontalRuleCHAR();
              while (result4 !== null) {
                result3.push(result4);
                result4 = parse_HorizontalRuleCHAR();
              }
              if (result3 !== null) {
                result4 = (function(offset, hr1, hr2, hr3) {
                    return (hr1 === hr2 && hr2 === hr3);
                  })(pos, result0, result1, result2) ? "" : null;
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos0;
                }
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_HorizontalRuleCHAR() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 42) {
          result0 = "*";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"*\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 45) {
            result0 = "-";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 95) {
              result0 = "_";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"_\"");
              }
            }
          }
        }
        if (result0 !== null) {
          result1 = [];
          result2 = parse_Space();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_Space();
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
            return char;
          })(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ListOrdered() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_ListOrderedItem();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_ListOrderedItem();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, items) {return el('list_ordered', items);})(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ListOrderedItem() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_ListOrderedItemStart();
        if (result0 !== null) {
          result2 = parse_ListOrderedItemChar();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_ListOrderedItemChar();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result2 = parse_ListOrderedItemEnd();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
              return el('list_item', parse(join(chars)));
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ListOrderedItemChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_ListOrderedItemEnd();
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
              return char;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ListOrderedItemStart() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        reportFailures++;
        result0 = parse_Emphasis1();
        if (result0 === null) {
          result0 = parse_Strong1();
          if (result0 === null) {
            result0 = parse_HorizontalRule();
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          if (/^[0-9]/.test(input.charAt(pos))) {
            result2 = input.charAt(pos);
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("[0-9]");
            }
          }
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              if (/^[0-9]/.test(input.charAt(pos))) {
                result2 = input.charAt(pos);
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("[0-9]");
                }
              }
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 46) {
              result2 = ".";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result2 !== null) {
              result3 = [];
              result4 = parse_Space();
              while (result4 !== null) {
                result3.push(result4);
                result4 = parse_Space();
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ListOrderedItemEnd() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_NewLine();
        if (result0 !== null) {
          pos1 = pos;
          reportFailures++;
          result1 = parse_ListOrderedItem();
          reportFailures--;
          if (result1 !== null) {
            result1 = "";
            pos = pos1;
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          result0 = parse_NewLine();
          if (result0 !== null) {
            result1 = parse_BlankLine();
            if (result1 !== null) {
              pos1 = pos;
              reportFailures++;
              result2 = parse_BlockIndent();
              reportFailures--;
              if (result2 === null) {
                result2 = "";
              } else {
                result2 = null;
                pos = pos1;
              }
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
          if (result0 === null) {
            result0 = parse_EOF();
          }
        }
        return result0;
      }
      
      function parse_ListUnordered() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_ListUnorderedItem();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_ListUnorderedItem();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, items) {return el('list_unordered', items);})(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ListUnorderedItem() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_ListUnorderedItemStart();
        if (result0 !== null) {
          result2 = parse_ListUnorderedItemChar();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_ListUnorderedItemChar();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result2 = parse_ListUnorderedItemEnd();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
              return el('list_item', parse(join(chars)));
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ListUnorderedItemChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_ListUnorderedItemEnd();
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
              return char;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ListUnorderedItemStart() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        reportFailures++;
        result0 = parse_Emphasis1();
        if (result0 === null) {
          result0 = parse_Strong1();
          if (result0 === null) {
            result0 = parse_HorizontalRule();
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 42) {
            result1 = "*";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"*\"");
            }
          }
          if (result1 === null) {
            if (input.charCodeAt(pos) === 45) {
              result1 = "-";
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"-\"");
              }
            }
            if (result1 === null) {
              if (input.charCodeAt(pos) === 43) {
                result1 = "+";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"+\"");
                }
              }
            }
          }
          if (result1 !== null) {
            result2 = [];
            result3 = parse_Space();
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse_Space();
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ListUnorderedItemEnd() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_NewLine();
        if (result0 !== null) {
          pos1 = pos;
          reportFailures++;
          result1 = parse_ListUnorderedItem();
          reportFailures--;
          if (result1 !== null) {
            result1 = "";
            pos = pos1;
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          result0 = parse_NewLine();
          if (result0 !== null) {
            result1 = parse_BlankLine();
            if (result1 !== null) {
              pos1 = pos;
              reportFailures++;
              result2 = parse_BlockIndent();
              reportFailures--;
              if (result2 === null) {
                result2 = "";
              } else {
                result2 = null;
                pos = pos1;
              }
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
          if (result0 === null) {
            result0 = parse_EOF();
          }
        }
        return result0;
      }
      
      function parse_HeaderSetext() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_HeaderSetextText();
        if (result0 !== null) {
          result1 = parse_NewLine();
          if (result1 !== null) {
            result2 = parse_HeaderSetextLevel();
            if (result2 !== null) {
              result3 = parse_DoubleNewLine();
              if (result3 === null) {
                pos2 = pos;
                result3 = parse_NewLine();
                if (result3 !== null) {
                  result4 = parse_EOF();
                  if (result4 !== null) {
                    result3 = [result3, result4];
                  } else {
                    result3 = null;
                    pos = pos2;
                  }
                } else {
                  result3 = null;
                  pos = pos2;
                }
                if (result3 === null) {
                  result3 = parse_EOF();
                }
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, text, level) {
            return el('header', text, {
              level: (level[0] === "=" ? 1 : 2)
            });
          })(pos0, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_HeaderSetextText() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_NonNewLine();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_NonNewLine();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
            return join(chars);
          })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_HeaderSetextLevel() {
        var result0, result1;
        
        if (input.charCodeAt(pos) === 61) {
          result1 = "=";
          pos++;
        } else {
          result1 = null;
          if (reportFailures === 0) {
            matchFailed("\"=\"");
          }
        }
        if (result1 === null) {
          if (input.charCodeAt(pos) === 45) {
            result1 = "-";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            if (input.charCodeAt(pos) === 61) {
              result1 = "=";
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"=\"");
              }
            }
            if (result1 === null) {
              if (input.charCodeAt(pos) === 45) {
                result1 = "-";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"-\"");
                }
              }
            }
          }
        } else {
          result0 = null;
        }
        return result0;
      }
      
      function parse_Header() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_HeaderStart();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_Space();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_Space();
          }
          if (result1 !== null) {
            result2 = parse_HeaderText();
            if (result2 !== null) {
              result3 = parse_HeaderEnd();
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, level, text) {
            return el('header', text, {
              level: level.length
            });
          })(pos0, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_HeaderText() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_HeaderChar();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_HeaderChar();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
            return join(chars);
          })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_HeaderChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_HeaderEnd();
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
            return char;
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_HeaderStart() {
        var result0, result1;
        
        if (input.charCodeAt(pos) === 35) {
          result1 = "#";
          pos++;
        } else {
          result1 = null;
          if (reportFailures === 0) {
            matchFailed("\"#\"");
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            if (input.charCodeAt(pos) === 35) {
              result1 = "#";
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"#\"");
              }
            }
          }
        } else {
          result0 = null;
        }
        return result0;
      }
      
      function parse_HeaderEnd() {
        var result0, result1, result2, result3;
        var pos0;
        
        pos0 = pos;
        result0 = [];
        result1 = parse_Space();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_Space();
        }
        if (result0 !== null) {
          result1 = [];
          if (input.charCodeAt(pos) === 35) {
            result2 = "#";
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\"#\"");
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            if (input.charCodeAt(pos) === 35) {
              result2 = "#";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"#\"");
              }
            }
          }
          if (result1 !== null) {
            result2 = [];
            result3 = parse_Space();
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse_Space();
            }
            if (result2 !== null) {
              result3 = parse_DoubleNewLine();
              if (result3 === null) {
                result3 = parse_EOF();
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Paragraph() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_ParagraphInline();
        if (result1 === null) {
          result1 = parse_ParagraphText();
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_ParagraphInline();
            if (result1 === null) {
              result1 = parse_ParagraphText();
            }
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, text) {
            return el('paragraph', text);
          })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ParagraphText() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_ParagraphChar();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_ParagraphChar();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
            return el('text', join(chars));
          })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ParagraphChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_ParagraphInline();
        if (result0 === null) {
          result0 = parse_DoubleNewLine();
          if (result0 === null) {
            result0 = parse_EOF();
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
            return char;
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ParagraphInline() {
        var result0;
        
        result0 = parse_SimpleInline();
        if (result0 === null) {
          result0 = parse_EmphasisIgnore();
          if (result0 === null) {
            result0 = parse_Strong();
            if (result0 === null) {
              result0 = parse_Emphasis();
            }
          }
        }
        return result0;
      }
      
      function parse_SimpleInline() {
        var result0;
        
        result0 = parse_CodeInline1();
        if (result0 === null) {
          result0 = parse_CodeInline2();
          if (result0 === null) {
            result0 = parse_LinkImageInline();
            if (result0 === null) {
              result0 = parse_LinkImageReference();
              if (result0 === null) {
                result0 = parse_LinkInline();
                if (result0 === null) {
                  result0 = parse_LinkReference();
                  if (result0 === null) {
                    result0 = parse_LinkInlineAuto();
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_CodeInline1() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_CodeInline1Wrap();
        if (result0 !== null) {
          result2 = parse_CodeInline1Char();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_CodeInline1Char();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result2 = parse_CodeInline1Wrap();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, text) {
              return el('code_inline', join(text));
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_CodeInline1Char() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_CodeInline1Wrap();
        if (result0 === null) {
          result0 = parse_NewLine();
          if (result0 === null) {
            result0 = parse_EOF();
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
              return char;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_CodeInline1Wrap() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        if (input.substr(pos, 2) === "``") {
          result0 = "``";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"``\"");
          }
        }
        if (result0 !== null) {
          pos1 = pos;
          reportFailures++;
          if (input.charCodeAt(pos) === 96) {
            result1 = "`";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"`\"");
            }
          }
          reportFailures--;
          if (result1 === null) {
            result1 = "";
          } else {
            result1 = null;
            pos = pos1;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_CodeInline2() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_CodeInline2Wrap();
        if (result0 !== null) {
          result2 = parse_CodeInline2Char();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_CodeInline2Char();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result2 = parse_CodeInline2Wrap();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, text) {
              return el('code_inline', join(text));
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_CodeInline2Char() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_CodeInline2Wrap();
        if (result0 === null) {
          result0 = parse_NewLine();
          if (result0 === null) {
            result0 = parse_EOF();
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
              return char;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_CodeInline2Wrap() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        if (input.charCodeAt(pos) === 96) {
          result0 = "`";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"`\"");
          }
        }
        if (result0 !== null) {
          pos1 = pos;
          reportFailures++;
          if (input.charCodeAt(pos) === 96) {
            result1 = "`";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"`\"");
            }
          }
          reportFailures--;
          if (result1 === null) {
            result1 = "";
          } else {
            result1 = null;
            pos = pos1;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_CodeInline() {
        var result0;
        
        result0 = parse_CodeInline1();
        if (result0 === null) {
          result0 = parse_CodeInline2();
        }
        return result0;
      }
      
      function parse_LinkImageInline() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 33) {
          result0 = "!";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"!\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_LinkInline();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, link) {
            return el('link_image', '', {
              src: link.attrs.href,
              title: link.attrs.title,
              alt: link.content
            });
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LinkImageReference() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 33) {
          result0 = "!";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"!\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_LinkReference();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, ref) {
            return el('link_reference_image', '', {
              id: ref.attrs.id,
              title: ref.content
            });
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LinkInline() {
        var result0, result1, result2, result3, result4, result5, result6, result7, result8;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_LinkTextStart();
        if (result0 !== null) {
          result1 = parse_LinkImageInline();
          if (result1 === null) {
            result1 = parse_LinkImageReference();
            if (result1 === null) {
              result1 = parse_LinkInlineText();
            }
          }
          if (result1 !== null) {
            result2 = parse_LinkTextEnd();
            if (result2 !== null) {
              result3 = [];
              result4 = parse_Space();
              while (result4 !== null) {
                result3.push(result4);
                result4 = parse_Space();
              }
              if (result3 !== null) {
                result4 = parse_LinkInlineHrefStart();
                if (result4 !== null) {
                  result6 = parse_LinkInlineHrefChar();
                  if (result6 !== null) {
                    result5 = [];
                    while (result6 !== null) {
                      result5.push(result6);
                      result6 = parse_LinkInlineHrefChar();
                    }
                  } else {
                    result5 = null;
                  }
                  if (result5 !== null) {
                    result6 = [];
                    result7 = parse_Space();
                    while (result7 !== null) {
                      result6.push(result7);
                      result7 = parse_Space();
                    }
                    if (result6 !== null) {
                      result7 = parse_LinkInlineTitle();
                      result7 = result7 !== null ? result7 : "";
                      if (result7 !== null) {
                        result8 = parse_LinkInlineHrefEnd();
                        if (result8 !== null) {
                          result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8];
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, content, href, title) {
            return el('link_inline', content, {
              href: join(href),
              title: title
            });
          })(pos0, result0[1], result0[5], result0[7]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LinkInlineText() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_LinkTextChar();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_LinkTextChar();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
            return el('text', join(chars));
          })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LinkInlineTitle() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 34) {
          result0 = "\"";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\\"\"");
          }
        }
        if (result0 !== null) {
          result1 = [];
          result2 = parse_LinkInlineTitleChar();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_LinkInlineTitleChar();
          }
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 34) {
              result2 = "\"";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"\\\"\"");
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
            return join(chars);
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LinkInlineTitleChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        if (input.charCodeAt(pos) === 34) {
          result0 = "\"";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\\"\"");
          }
        }
        if (result0 === null) {
          result0 = parse_LinkInlineHrefEnd();
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
            return char;
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LinkInlineHrefChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_LinkInlineHrefEnd();
        if (result0 === null) {
          result0 = parse_Space();
          if (result0 === null) {
            result0 = parse_NewLine();
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
            return char;
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LinkInlineHrefStart() {
        var result0;
        
        if (input.charCodeAt(pos) === 40) {
          result0 = "(";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"(\"");
          }
        }
        return result0;
      }
      
      function parse_LinkInlineHrefEnd() {
        var result0;
        
        if (input.charCodeAt(pos) === 41) {
          result0 = ")";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\")\"");
          }
        }
        return result0;
      }
      
      function parse_LinkReference() {
        var result0, result1, result2, result3, result4, result5, result6;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_LinkTextStart();
        if (result0 !== null) {
          result2 = parse_LinkTextChar();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_LinkTextChar();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result2 = parse_LinkTextEnd();
            if (result2 !== null) {
              result3 = [];
              result4 = parse_Space();
              while (result4 !== null) {
                result3.push(result4);
                result4 = parse_Space();
              }
              if (result3 !== null) {
                result4 = parse_LinkTextStart();
                if (result4 !== null) {
                  result5 = [];
                  result6 = parse_LinkTextChar();
                  while (result6 !== null) {
                    result5.push(result6);
                    result6 = parse_LinkTextChar();
                  }
                  if (result5 !== null) {
                    result6 = parse_LinkTextEnd();
                    if (result6 !== null) {
                      result0 = [result0, result1, result2, result3, result4, result5, result6];
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, text, id) {
            return el('link_reference', join(text), {
              id: join(id)
            });
          })(pos0, result0[1], result0[5]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LinkLabel() {
        var result0, result1, result2, result3, result4, result5, result6, result7, result8, result9;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = [];
        result1 = parse_Space();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_Space();
        }
        if (result0 !== null) {
          result1 = parse_LinkTextStart();
          if (result1 !== null) {
            result3 = parse_LinkTextChar();
            if (result3 !== null) {
              result2 = [];
              while (result3 !== null) {
                result2.push(result3);
                result3 = parse_LinkTextChar();
              }
            } else {
              result2 = null;
            }
            if (result2 !== null) {
              result3 = parse_LinkTextEnd();
              if (result3 !== null) {
                if (input.charCodeAt(pos) === 58) {
                  result4 = ":";
                  pos++;
                } else {
                  result4 = null;
                  if (reportFailures === 0) {
                    matchFailed("\":\"");
                  }
                }
                if (result4 !== null) {
                  result5 = [];
                  result6 = parse_Space();
                  while (result6 !== null) {
                    result5.push(result6);
                    result6 = parse_Space();
                  }
                  if (result5 !== null) {
                    result7 = parse_LinkLabelHrefChar();
                    if (result7 !== null) {
                      result6 = [];
                      while (result7 !== null) {
                        result6.push(result7);
                        result7 = parse_LinkLabelHrefChar();
                      }
                    } else {
                      result6 = null;
                    }
                    if (result6 !== null) {
                      result7 = [];
                      result8 = parse_Space();
                      while (result8 !== null) {
                        result7.push(result8);
                        result8 = parse_Space();
                      }
                      if (result7 !== null) {
                        result8 = parse_LinkLabelTitle();
                        result8 = result8 !== null ? result8 : "";
                        if (result8 !== null) {
                          result9 = parse_NewLine();
                          if (result9 !== null) {
                            result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8, result9];
                          } else {
                            result0 = null;
                            pos = pos1;
                          }
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, id, href, title) {
            return el('link_label', '', {
              href: join(href),
              title: title,
              id: join(id)
            });
          })(pos0, result0[2], result0[6], result0[8]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LinkLabelHrefChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_Space();
        if (result0 === null) {
          result0 = parse_NewLine();
          if (result0 === null) {
            result0 = parse_EOF();
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
            return char;
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LinkLabelTitle() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 34) {
          result0 = "\"";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\\"\"");
          }
        }
        if (result0 !== null) {
          result1 = [];
          result2 = parse_LinkInlineTitleChar();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_LinkInlineTitleChar();
          }
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 34) {
              result2 = "\"";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"\\\"\"");
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
            return join(chars);
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LinkLabelTitleChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        if (input.charCodeAt(pos) === 34) {
          result0 = "\"";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\\"\"");
          }
        }
        if (result0 === null) {
          result0 = parse_NewLine();
          if (result0 === null) {
            result0 = parse_EOF();
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
            return char;
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LinkTextChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_LinkTextEnd();
        if (result0 === null) {
          result0 = parse_NewLine();
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
            return char;
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LinkTextStart() {
        var result0;
        
        if (input.charCodeAt(pos) === 91) {
          result0 = "[";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"[\"");
          }
        }
        return result0;
      }
      
      function parse_LinkTextEnd() {
        var result0;
        
        if (input.charCodeAt(pos) === 93) {
          result0 = "]";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"]\"");
          }
        }
        return result0;
      }
      
      function parse_LinkInlineAuto() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_LinkInlineAutoStart();
        if (result0 !== null) {
          result1 = parse_LinkInlineAutoLink();
          if (result1 !== null) {
            result2 = parse_LinkInlineAutoEnd();
            if (result2 !== null) {
              result3 = (function(offset, href) {
                  return (href.charAt(href.length - 1) === "/") || (href.match(protocolRx));
                })(pos, result1) ? "" : null;
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, href) {
            return el('link_inline_auto', href);
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LinkInlineAutoLink() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_LinkInlineAutoChar();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_LinkInlineAutoChar();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
            return join(chars);
          })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LinkInlineAutoChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_LinkInlineAutoEnd();
        if (result0 === null) {
          result0 = parse_Space();
          if (result0 === null) {
            result0 = parse_NewLine();
            if (result0 === null) {
              result0 = parse_EOF();
            }
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
            return char;
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LinkInlineAutoStart() {
        var result0;
        
        if (input.charCodeAt(pos) === 60) {
          result0 = "<";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"<\"");
          }
        }
        return result0;
      }
      
      function parse_LinkInlineAutoEnd() {
        var result0;
        
        if (input.charCodeAt(pos) === 62) {
          result0 = ">";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\">\"");
          }
        }
        return result0;
      }
      
      function parse_EmphasisIgnore() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        if (input.charCodeAt(pos) === 42) {
          result0 = "*";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"*\"");
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_EmphasisIgnoreStart();
          if (result1 !== null) {
            result2 = parse_EmphasisIgnoreEnd();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, start, end) {
            return el('text', start + end);
          })(pos0, result0[1], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_EmphasisIgnoreStart() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_EmphasisIgnoreEnd();
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result2 = parse_EmphasisIgnoreStartPart();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_EmphasisIgnoreStartPart();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, start) {
            return join(start);
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_EmphasisIgnoreStartPart() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result1 = parse_EmphasisIgnoreChar();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_EmphasisIgnoreChar();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 95) {
            result1 = "_";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"_\"");
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
            return join(chars) + '_';
          })(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_EmphasisIgnoreEnd() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result1 = parse_EmphasisIgnoreChar();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_EmphasisIgnoreChar();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          pos2 = pos;
          reportFailures++;
          if (input.charCodeAt(pos) === 42) {
            result1 = "*";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"*\"");
            }
          }
          if (result1 === null) {
            result1 = parse_Space();
            if (result1 === null) {
              result1 = parse_NewLine();
              if (result1 === null) {
                result1 = parse_EOF();
              }
            }
          }
          reportFailures--;
          if (result1 !== null) {
            result1 = "";
            pos = pos2;
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
            return join(chars);
          })(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_EmphasisIgnoreChar() {
        var result0, result1;
        var pos0, pos1, pos2, pos3;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        if (input.charCodeAt(pos) === 42) {
          result0 = "*";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"*\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 95) {
            result0 = "_";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"_\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 58) {
              result0 = ":";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\":\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 59) {
                result0 = ";";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\";\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 46) {
                  result0 = ".";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\".\"");
                  }
                }
                if (result0 === null) {
                  pos3 = pos;
                  if (input.charCodeAt(pos) === 44) {
                    result0 = ",";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\",\"");
                    }
                  }
                  if (result0 !== null) {
                    result1 = parse_Space();
                    if (result1 !== null) {
                      result0 = [result0, result1];
                    } else {
                      result0 = null;
                      pos = pos3;
                    }
                  } else {
                    result0 = null;
                    pos = pos3;
                  }
                  if (result0 === null) {
                    result0 = parse_NewLine();
                    if (result0 === null) {
                      result0 = parse_EOF();
                    }
                  }
                }
              }
            }
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_NonSpaceCHAR();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
            return char;
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong1() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_Strong1Start();
        if (result0 !== null) {
          result1 = parse_Strong1Content();
          if (result1 !== null) {
            result2 = parse_Strong1End();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, wrapStart, content, wrapEnd) {return el('strong', content);})(pos0, result0[0], result0[1], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong1Content() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result1 = parse_Strong1Char();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_Strong1Char();
          }
        } else {
          result0 = null;
        }
        reportFailures--;
        if (result0 !== null) {
          result0 = "";
          pos = pos2;
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result2 = parse_Strong1Inline();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_Strong1Inline();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, inline) {
              return inline;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong1Inline() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_Strong();
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_EmphasisIgnore();
          if (result1 === null) {
            result1 = parse_Emphasis2();
            if (result1 === null) {
              result1 = parse_SimpleInline();
              if (result1 === null) {
                result1 = parse_Strong1Text();
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, inline) {
              return inline;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong1Text() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_Strong1TextChar();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_Strong1TextChar();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
              return el('text', join(chars));
            })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong1Start() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_Strong1Wrap();
        if (result0 !== null) {
          pos2 = pos;
          reportFailures++;
          result1 = parse_NonSpace();
          reportFailures--;
          if (result1 !== null) {
            result1 = "";
            pos = pos2;
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, wrap) {
              return wrap;
            })(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong1End() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_Strong1Wrap();
        if (result0 !== null) {
          result0 = (function(offset, wrap) {
              return wrap;
            })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong1TextChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_EmphasisIgnore();
        if (result0 === null) {
          result0 = parse_Emphasis2();
          if (result0 === null) {
            result0 = parse_SimpleInline();
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_Strong1Char();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
              return char;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong1Char() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_Strong1Wrap();
        if (result0 === null) {
          result0 = parse_NewLine();
          if (result0 === null) {
            result0 = parse_EOF();
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
              return char;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong1Wrap() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_Strong1NonWrap();
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_Strong1WrapChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, wrap) {
              return wrap;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong1NonWrap() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        reportFailures++;
        result0 = parse_Space();
        reportFailures--;
        if (result0 !== null) {
          result0 = "";
          pos = pos1;
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result1 = parse_Strong1WrapChar();
          if (result1 !== null) {
            pos1 = pos;
            reportFailures++;
            result2 = parse_Space();
            reportFailures--;
            if (result2 !== null) {
              result2 = "";
              pos = pos1;
            } else {
              result2 = null;
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong1WrapChar() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        if (input.substr(pos, 2) === "**") {
          result0 = "**";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"**\"");
          }
        }
        if (result0 !== null) {
          pos1 = pos;
          reportFailures++;
          result1 = parse_Emphasis1Wrap();
          reportFailures--;
          if (result1 === null) {
            result1 = "";
          } else {
            result1 = null;
            pos = pos1;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong2() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_Strong2Start();
        if (result0 !== null) {
          result1 = parse_Strong2Content();
          if (result1 !== null) {
            result2 = parse_Strong2End();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, wrapStart, content, wrapEnd) {return el('strong', content);})(pos0, result0[0], result0[1], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong2Content() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result1 = parse_Strong2Char();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_Strong2Char();
          }
        } else {
          result0 = null;
        }
        reportFailures--;
        if (result0 !== null) {
          result0 = "";
          pos = pos2;
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result2 = parse_Strong2Inline();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_Strong2Inline();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, inline) {
              return inline;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong2Inline() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_Strong();
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_EmphasisIgnore();
          if (result1 === null) {
            result1 = parse_Emphasis1();
            if (result1 === null) {
              result1 = parse_SimpleInline();
              if (result1 === null) {
                result1 = parse_Strong2Text();
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, inline) {
              return inline;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong2Text() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_Strong2TextChar();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_Strong2TextChar();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
              return el('text', join(chars));
            })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong2Start() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_Strong2Wrap();
        if (result0 !== null) {
          pos2 = pos;
          reportFailures++;
          result1 = parse_NonSpace();
          reportFailures--;
          if (result1 !== null) {
            result1 = "";
            pos = pos2;
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, wrap) {
              return wrap;
            })(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong2End() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_Strong2Wrap();
        if (result0 !== null) {
          result0 = (function(offset, wrap) {
              return wrap;
            })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong2TextChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_EmphasisIgnore();
        if (result0 === null) {
          result0 = parse_Emphasis1();
          if (result0 === null) {
            result0 = parse_SimpleInline();
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_Strong2Char();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
              return char;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong2Char() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_Strong2Wrap();
        if (result0 === null) {
          result0 = parse_NewLine();
          if (result0 === null) {
            result0 = parse_EOF();
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
              return char;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong2Wrap() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_Strong2NonWrap();
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_Strong2WrapChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, wrap) {
              return wrap;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong2NonWrap() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        reportFailures++;
        result0 = parse_Space();
        reportFailures--;
        if (result0 !== null) {
          result0 = "";
          pos = pos1;
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result1 = parse_Strong2WrapChar();
          if (result1 !== null) {
            pos1 = pos;
            reportFailures++;
            result2 = parse_Space();
            reportFailures--;
            if (result2 !== null) {
              result2 = "";
              pos = pos1;
            } else {
              result2 = null;
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong2WrapChar() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        if (input.substr(pos, 2) === "__") {
          result0 = "__";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"__\"");
          }
        }
        if (result0 !== null) {
          pos1 = pos;
          reportFailures++;
          result1 = parse_Emphasis2Wrap();
          reportFailures--;
          if (result1 === null) {
            result1 = "";
          } else {
            result1 = null;
            pos = pos1;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Strong() {
        var result0;
        
        result0 = parse_Strong1();
        if (result0 === null) {
          result0 = parse_Strong2();
        }
        return result0;
      }
      
      function parse_Emphasis1() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_Emphasis1Start();
        if (result0 !== null) {
          result1 = parse_Emphasis1Content();
          if (result1 !== null) {
            result2 = parse_Emphasis1End();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, wrapStart, content, wrapEnd) {return el('emphasis', content);})(pos0, result0[0], result0[1], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis1Content() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result1 = parse_Emphasis1Char();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_Emphasis1Char();
          }
        } else {
          result0 = null;
        }
        reportFailures--;
        if (result0 !== null) {
          result0 = "";
          pos = pos2;
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result2 = parse_Emphasis1Inline();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_Emphasis1Inline();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, inline) {
              return inline;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis1Inline() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_Emphasis();
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_EmphasisIgnore();
          if (result1 === null) {
            result1 = parse_Strong2();
            if (result1 === null) {
              result1 = parse_SimpleInline();
              if (result1 === null) {
                result1 = parse_Emphasis1Text();
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, inline) {
              return inline;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis1Text() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_Emphasis1TextChar();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_Emphasis1TextChar();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
              return el('text', join(chars));
            })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis1Start() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_Emphasis1Wrap();
        if (result0 !== null) {
          pos2 = pos;
          reportFailures++;
          result1 = parse_NonSpace();
          reportFailures--;
          if (result1 !== null) {
            result1 = "";
            pos = pos2;
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, wrap) {
              return wrap;
            })(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis1End() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_Emphasis1Wrap();
        if (result0 !== null) {
          result0 = (function(offset, wrap) {
              return wrap;
            })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis1TextChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_EmphasisIgnore();
        if (result0 === null) {
          result0 = parse_Strong2();
          if (result0 === null) {
            result0 = parse_SimpleInline();
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_Emphasis1Char();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
              return char;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis1Char() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_Emphasis1Wrap();
        if (result0 === null) {
          result0 = parse_NewLine();
          if (result0 === null) {
            result0 = parse_EOF();
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
              return char;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis1Wrap() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_Emphasis1NonWrap();
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_Emphasis1WrapChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, wrap) {
              return wrap;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis1NonWrap() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        reportFailures++;
        result0 = parse_Space();
        reportFailures--;
        if (result0 !== null) {
          result0 = "";
          pos = pos1;
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result1 = parse_Emphasis1WrapChar();
          if (result1 !== null) {
            pos1 = pos;
            reportFailures++;
            result2 = parse_Space();
            reportFailures--;
            if (result2 !== null) {
              result2 = "";
              pos = pos1;
            } else {
              result2 = null;
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis1WrapChar() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        if (input.charCodeAt(pos) === 42) {
          result0 = "*";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"*\"");
          }
        }
        if (result0 !== null) {
          pos1 = pos;
          reportFailures++;
          result1 = parse_Strong1Wrap();
          reportFailures--;
          if (result1 === null) {
            result1 = "";
          } else {
            result1 = null;
            pos = pos1;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis2() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_Emphasis2Start();
        if (result0 !== null) {
          result1 = parse_Emphasis2Content();
          if (result1 !== null) {
            result2 = parse_Emphasis2End();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, wrapStart, content, wrapEnd) {return el('emphasis', content);})(pos0, result0[0], result0[1], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis2Content() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result1 = parse_Emphasis2Char();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_Emphasis2Char();
          }
        } else {
          result0 = null;
        }
        reportFailures--;
        if (result0 !== null) {
          result0 = "";
          pos = pos2;
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result2 = parse_Emphasis2Inline();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_Emphasis2Inline();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, inline) {
              return inline;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis2Inline() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_Emphasis();
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_EmphasisIgnore();
          if (result1 === null) {
            result1 = parse_Strong1();
            if (result1 === null) {
              result1 = parse_SimpleInline();
              if (result1 === null) {
                result1 = parse_Emphasis2Text();
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, inline) {
              return inline;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis2Text() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_Emphasis2TextChar();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_Emphasis2TextChar();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
              return el('text', join(chars));
            })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis2Start() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_Emphasis2Wrap();
        if (result0 !== null) {
          pos2 = pos;
          reportFailures++;
          result1 = parse_NonSpace();
          reportFailures--;
          if (result1 !== null) {
            result1 = "";
            pos = pos2;
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, wrap) {
              return wrap;
            })(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis2End() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_Emphasis2Wrap();
        if (result0 !== null) {
          result0 = (function(offset, wrap) {
              return wrap;
            })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis2TextChar() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_EmphasisIgnore();
        if (result0 === null) {
          result0 = parse_Strong1();
          if (result0 === null) {
            result0 = parse_SimpleInline();
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_Emphasis2Char();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
              return char;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis2Char() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_Emphasis2Wrap();
        if (result0 === null) {
          result0 = parse_NewLine();
          if (result0 === null) {
            result0 = parse_EOF();
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
              return char;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis2Wrap() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_Emphasis2NonWrap();
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_Emphasis2WrapChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, wrap) {
              return wrap;
            })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis2NonWrap() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        reportFailures++;
        result0 = parse_Space();
        reportFailures--;
        if (result0 !== null) {
          result0 = "";
          pos = pos1;
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result1 = parse_Emphasis2WrapChar();
          if (result1 !== null) {
            pos1 = pos;
            reportFailures++;
            result2 = parse_Space();
            reportFailures--;
            if (result2 !== null) {
              result2 = "";
              pos = pos1;
            } else {
              result2 = null;
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis2WrapChar() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        if (input.charCodeAt(pos) === 95) {
          result0 = "_";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"_\"");
          }
        }
        if (result0 !== null) {
          pos1 = pos;
          reportFailures++;
          result1 = parse_Strong2Wrap();
          reportFailures--;
          if (result1 === null) {
            result1 = "";
          } else {
            result1 = null;
            pos = pos1;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Emphasis() {
        var result0;
        
        result0 = parse_Emphasis1();
        if (result0 === null) {
          result0 = parse_Emphasis2();
        }
        return result0;
      }
      
      function parse_DoubleNewLine() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result0 = parse_NewLine();
        if (result0 !== null) {
          result1 = parse_BlankLine();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_BlankLines() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_BlankLine();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_BlankLine();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
            return el('blank');
          })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_BlankLine() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = [];
        result1 = parse_Space();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_Space();
        }
        if (result0 !== null) {
          result1 = parse_NewLine();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
            return el('blank');
          })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_NonSpace() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_NonSpaceCHAR();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_NonSpaceCHAR();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) {
            return join(chars);
          })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_NonSpaceCHAR() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_SPACE_CHAR();
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
            return char;
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Space() {
        var result0, result1;
        
        result1 = parse_SPACE_CHAR();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_SPACE_CHAR();
          }
        } else {
          result0 = null;
        }
        return result0;
      }
      
      function parse_SPACE_CHAR() {
        var result0;
        
        if (/^[ \t\x0B\f\xA0\uFEFF\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[ \\t\\x0B\\f\\xA0\\uFEFF\\u1680\\u180E\\u2000-\\u200A\\u202F\\u205F\\u3000]");
          }
        }
        return result0;
      }
      
      function parse_NonNewLine() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        reportFailures++;
        result0 = parse_NewLine();
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 !== null) {
          result1 = parse_AnyChar();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, char) {
            return char;
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_NewLine() {
        var result0;
        
        if (input.charCodeAt(pos) === 10) {
          result0 = "\n";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\n\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 2) === "\r\n") {
            result0 = "\r\n";
            pos += 2;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"\\r\\n\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 13) {
              result0 = "\r";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"\\r\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 8232) {
                result0 = "\u2028";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"\\u2028\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 8233) {
                  result0 = "\u2029";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"\\u2029\"");
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_EOF() {
        var result0;
        var pos0;
        
        pos0 = pos;
        reportFailures++;
        if (input.length > pos) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("any character");
          }
        }
        reportFailures--;
        if (result0 === null) {
          result0 = "";
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_AnyChar() {
        var result0;
        
        if (input.length > pos) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("any character");
          }
        }
        return result0;
      }
      
      
      function cleanupExpected(expected) {
        expected.sort();
        
        var lastExpected = null;
        var cleanExpected = [];
        for (var i = 0; i < expected.length; i++) {
          if (expected[i] !== lastExpected) {
            cleanExpected.push(expected[i]);
            lastExpected = expected[i];
          }
        }
        return cleanExpected;
      }
      
      function computeErrorPosition() {
        /*
         * The first idea was to use |String.split| to break the input up to the
         * error position along newlines and derive the line and column from
         * there. However IE's |split| implementation is so broken that it was
         * enough to prevent it.
         */
        
        var line = 1;
        var column = 1;
        var seenCR = false;
        
        for (var i = 0; i < Math.max(pos, rightmostFailuresPos); i++) {
          var ch = input.charAt(i);
          if (ch === "\n") {
            if (!seenCR) { line++; }
            column = 1;
            seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            line++;
            column = 1;
            seenCR = true;
          } else {
            column++;
            seenCR = false;
          }
        }
        
        return { line: line, column: column };
      }
      
      
          var el, join, linksLabels, parse, protocolRx;
          linksLabels = {};
          protocolRx = /^[a-zA-Z]+:\/\//;
          el = function(name, content, attrs) {
            var ret;
            if (content == null) {
              content = null;
            }
            if (attrs == null) {
              attrs = {};
            }
            ret = {
              name: name,
              content: content,
              attrs: attrs
            };
            if (name === 'link_label') {
              linksLabels[ret.attrs.id.toLowerCase()] = ret.attrs;
            }
            return ret;
          };
          join = function(s) {
            return s.join('');
          };
          parse = function(text) {
            var attrs, id, res, _ref;
            res = Markdown.Parser.parse(text);
            _ref = res.linksLabels;
            for (id in _ref) {
              attrs = _ref[id];
              linksLabels[id] = attrs;
            }
            return res.elements;
          };
        
      
      
      var result = parseFunctions[startRule]();
      
      /*
       * The parser is now in one of the following three states:
       *
       * 1. The parser successfully parsed the whole input.
       *
       *    - |result !== null|
       *    - |pos === input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 2. The parser successfully parsed only a part of the input.
       *
       *    - |result !== null|
       *    - |pos < input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 3. The parser did not successfully parse any part of the input.
       *
       *   - |result === null|
       *   - |pos === 0|
       *   - |rightmostFailuresExpected| contains at least one failure
       *
       * All code following this comment (including called functions) must
       * handle these states.
       */
      if (result === null || pos !== input.length) {
        var offset = Math.max(pos, rightmostFailuresPos);
        var found = offset < input.length ? input.charAt(offset) : null;
        var errorPosition = computeErrorPosition();
        
        throw new this.SyntaxError(
          cleanupExpected(rightmostFailuresExpected),
          found,
          offset,
          errorPosition.line,
          errorPosition.column
        );
      }
      
      return result;
    },
    
    /* Returns the parser source code. */
    toSource: function() { return this._source; }
  };
  
  /* Thrown when a parser encounters a syntax error. */
  
  result.SyntaxError = function(expected, found, offset, line, column) {
    function buildMessage(expected, found) {
      var expectedHumanized, foundHumanized;
      
      switch (expected.length) {
        case 0:
          expectedHumanized = "end of input";
          break;
        case 1:
          expectedHumanized = expected[0];
          break;
        default:
          expectedHumanized = expected.slice(0, expected.length - 1).join(", ")
            + " or "
            + expected[expected.length - 1];
      }
      
      foundHumanized = found ? quote(found) : "end of input";
      
      return "Expected " + expectedHumanized + " but " + foundHumanized + " found.";
    }
    
    this.name = "SyntaxError";
    this.expected = expected;
    this.found = found;
    this.message = buildMessage(expected, found);
    this.offset = offset;
    this.line = line;
    this.column = column;
  };
  
  result.SyntaxError.prototype = Error.prototype;
  
  return result;
})();
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