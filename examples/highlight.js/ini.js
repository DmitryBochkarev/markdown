module.exports = function(hljs) {
  return {
    case_insensitive: true,
    defaultMode: {
      illegal: '[^\\s]',
      contains: [
        {
          className: 'comment',
          begin: ';', end: '$'
        },
        {
          className: 'title',
          begin: '^\\[', end: '\\]'
        },
        {
          className: 'setting',
          begin: '^[a-z0-9_\\[\\]]+[ \\t]*=[ \\t]*', end: '$',
          contains: [
            {
              className: 'value',
              endsWithParent: true,
              keywords: 'on off true false yes no',
              contains: [hljs.QUOTE_STRING_MODE, hljs.NUMBER_MODE]
            }
          ]
        }
      ]
    }
  };
};