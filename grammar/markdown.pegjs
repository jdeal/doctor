start
  = lines:(Line / BlankLine)* {
    return {
      type: 'markdown',
      content: lines.join('')
    }
  }

Line
  = chars:LineChar+ newline:LineTerminatorSequence? {
    return chars.join('') + newline;
  }

BlankLine
  = newLine: LineTerminatorSequence {
    return newLine;
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
  = ws:(WhiteSpace / LineTerminatorSequence) {return ws;}

NonBlank
  = !(WhiteSpace / LineTerminatorSequence) char:. {return char;}

Identifier
  = start:IdentifierStart rest:IdentifierChar* {return start + rest.join('');}

IdentifierStart
  = [a-zA-Z_]

IdentifierChar
  = [a-zA-Z_0-9]
_
  = (WhiteSpace)*
__
  = (WhiteSpace / LineTerminatorSequence)*

WhiteSpace "whitespace"
  = [\t\v\f \u00A0\uFEFF]
  / Zs

LineTerminatorSequence "end of line"
  = "\n"
  / "\r\n"
  / "\r"
  / "\u2028" // line spearator
  / "\u2029" // paragraph separator

// Separator, Space
Zs = [\u0020\u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000]