start
  = description:Description? tags:TagList? {
    var tags = tags === '' ? [] : tags;
    if (description !== '') {
      tags = [{name: 'description', value: {description: description}}].concat(tags);
    }
    return tags;
  }

Description
  = __ !'@' start:NonBlank+ rest:DescriptionSpan* {
    return start.join('') + rest.join('');
  }

DescriptionSpan
  = ws:Blank+ !'@' chars:NonBlank+ {
    return ws.join('') + chars.join('');
  }

Blank
  = ws:(WhiteSpace / LineTerminatorSequence) {return ws;}

NonBlank
  = !(WhiteSpace / LineTerminatorSequence) char:. {return char;}

TagList
  = tags:Tag+ {
    return tags;
  }

Tag
  = __ tag:
    ( ParamTag / ReturnTag / ClassTag / ConstructorTag / PropertyTag
    ) {
      return tag;
    }

DefaultValue 
  = Blank* "=" Blank* chars:[^\]]+ {
    return chars.join('');
  }

ParamTag
  = '@param' types:TypeList? Blank+ lbracket:("[" Blank*)? name:Identifier defaultValue:DefaultValue? rbracket:(Blank* "]")? Blank+ text:Description {
    var tag = {name: 'param', value: {name: name, description: text}};
    if (types !== '') {
      tag.value.types = types;
    }
    if (lbracket !== '') {
      tag.value.optional = true;
    }
    if (defaultValue !== '') {
        tag.value.defaultValue = defaultValue;
    }
    return tag;
  }

ReturnTag
  = '@return' types:TypeList? Blank+ text:Description {
    var tag = {name: 'return', value: {description: text}};
    if (types !== '') {
      tag.value.types = types;
    }
    return tag;
  }

ClassTag
  = '@class' Blank+ text:Description {
    return {name: 'classDescription', value: {description: text}};
  }

ConstructorTag
  = '@constructor' Blank+ text:Description {
    return {name: 'constructor', value: {description: text}};
  }

PropertyTag
  = '@property' types:TypeList? Blank+ name:Identifier Blank+ text:Description {
    return {name: 'property', value: {name: name, description: text, types: types}};
  }

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

TypeList
  = Blank+ "{" Blank* start:Identifier Blank* rest:("|" Blank* Identifier)* Blank* "}" {
    var types = [start];
    rest.forEach(function (item, i) {
      types.push(item[2]);
    });
    return types;
  }

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