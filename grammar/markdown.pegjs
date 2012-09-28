start
  = nodes:(MarkupNode / ContentNode)* {
      var ast = {
        type: 'markdown',
        nodes: nodes === '' ? [] : nodes
      };
      //console.log(JSON.stringify(ast, null, 2));
      return ast;
    }

MarkupNode
  = InlineMarkupNode / BlockMarkupNode

InlineMarkupNode
  = LinkMarkupNode

BlockMarkupNode
  = HeadingMarkupNode

LinkMarkupNode
  = bang:'!'? '[' labelNodes:LabelMarkupNodes '](' _ urlChars:LinkUrlChar+ _ title:LinkTitle? _ ')' {
    var labelNode = {
      type: 'markdown-nodes',
      nodes: labelNodes
    };
    if (labelNodes.length === 1) {
      labelNode = labelNodes[0];
    }
    return {
      type: bang === '' ? 'markdown-link' : 'markdown-image',
      nodes: [
        labelNode,
        {
          type: 'markdown-url',
          value: urlChars.join('')
        },
        {
          type: 'markdown-title',
          value: title
        }
      ]
    }
  }

LinkUrlChar
  = !')' !'"' !LineTerminatorSequence char:NonBlank {
    return char;
  }

LinkTitle
  = '"' chars:LinkTitleChar* '"' {
    return chars === '' ? '' : chars.join('');
  }

LinkTitleChar
  = !'"' !LineTerminatorSequence char:. {
    return char;
  }

HeadingMarkupNode
  = hashes:('######' / '#####' / '####' / '###' / '##' / '#') _ nodes:ContentMarkupNodes {
    return {
      type: 'markdown-heading',
      nodes: [
        {
          type: 'markdown-level',
          value: hashes.length
        },
        {
          type: 'markdown-nodes',
          nodes: nodes
        }
      ]
    }
  }

LabelMarkupNodes
  = nodes:(InlineMarkupNode / LabelCharsNode)* {
    return nodes === '' ? [] : nodes;
  }

ContentMarkupNodes
  = nodes:(InlineMarkupNode / ContentCharsNode)* {
    return nodes === '' ? [] : nodes;
  }

ContentNode
  = lines:(ContentLine / BlankLine)+ {
      var content = lines.join('');
      return {
        type: 'markdown-content',
        value: content
      }
    }

ContentCharsNode
  = chars:ContentChar+ {
    var content = chars.join('');
    return {
      type: 'markdown-content',
      value: content
    }
  }

LabelCharsNode
  = chars:LabelContentChar+ {
    var content = chars.join('');
    return {
      type: 'markdown-content',
      value: content
    }
  }

ContentLine
  = !BlockMarkupNode chars:ContentChar+ newline:LineTerminatorSequence? {
      return chars.join('') + newline;
    }

BlankLine
  = newLine: LineTerminatorSequence {
      return newLine;
    }

LabelContentChar
  = !']' !InlineMarkupNode !LineTerminatorSequence char:. {
    return char;
  }

ContentChar
  = !InlineMarkupNode !LineTerminatorSequence char:. {
    return char;
  }


LineChar
  = !LineTerminatorSequence char:. {
      return char;
    }

Any
  = char:(Blank / NonBlank) {
      return char;
    }

Blank
  = ws:(WhiteSpace / LineTerminatorSequence) {
      return ws;
    }

NonBlank
  = !(WhiteSpace / LineTerminatorSequence) char:. {
      return char;
    }

Identifier
  = start:IdentifierStart rest:IdentifierChar* {
      return start + rest.join('');
    }

IdentifierStart
  = [a-zA-Z_]

IdentifierChar
  = [a-zA-Z_0-9]

_
  = (WhiteSpace)*

__
  = (WhiteSpace / LineTerminatorSequence)*

WhiteSpace
  = [\t\v\f \u00A0\uFEFF] / Space

LineTerminatorSequence "end of line"
  = "\n"
  / "\r\n"
  / "\r"
  / "\u2028" // line spearator
  / "\u2029" // paragraph separator

Space
  = [\u0020\u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000]