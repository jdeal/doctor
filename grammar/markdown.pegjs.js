module.exports = (function(){
  /* Generated by PEG.js 0.6.2 (http://pegjs.majda.cz/). */
  
  var result = {
    /*
     * Parses the input with a generated parser. If the parsing is successfull,
     * returns a value explicitly or implicitly specified by the grammar from
     * which the parser was generated (see |PEG.buildParser|). If the parsing is
     * unsuccessful, throws |PEG.parser.SyntaxError| describing the error.
     */
    parse: function(input, startRule) {
      var parseFunctions = {
        "Any": parse_Any,
        "Blank": parse_Blank,
        "BlankLine": parse_BlankLine,
        "Identifier": parse_Identifier,
        "IdentifierChar": parse_IdentifierChar,
        "IdentifierStart": parse_IdentifierStart,
        "Line": parse_Line,
        "LineChar": parse_LineChar,
        "LineTerminatorSequence": parse_LineTerminatorSequence,
        "NonBlank": parse_NonBlank,
        "WhiteSpace": parse_WhiteSpace,
        "Zs": parse_Zs,
        "_": parse__,
        "__": parse___,
        "start": parse_start
      };
      
      if (startRule !== undefined) {
        if (parseFunctions[startRule] === undefined) {
          throw new Error("Invalid rule name: " + quote(startRule) + ".");
        }
      } else {
        startRule = "start";
      }
      
      var pos = 0;
      var reportMatchFailures = true;
      var rightmostMatchFailuresPos = 0;
      var rightmostMatchFailuresExpected = [];
      var cache = {};
      
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
        
        if (charCode <= 0xFF) {
          var escapeChar = 'x';
          var length = 2;
        } else {
          var escapeChar = 'u';
          var length = 4;
        }
        
        return '\\' + escapeChar + padLeft(charCode.toString(16).toUpperCase(), '0', length);
      }
      
      function quote(s) {
        /*
         * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a
         * string literal except for the closing quote character, backslash,
         * carriage return, line separator, paragraph separator, and line feed.
         * Any character may appear in the form of an escape sequence.
         */
        return '"' + s
          .replace(/\\/g, '\\\\')            // backslash
          .replace(/"/g, '\\"')              // closing quote character
          .replace(/\r/g, '\\r')             // carriage return
          .replace(/\n/g, '\\n')             // line feed
          .replace(/[\x80-\uFFFF]/g, escape) // non-ASCII characters
          + '"';
      }
      
      function matchFailed(failure) {
        if (pos < rightmostMatchFailuresPos) {
          return;
        }
        
        if (pos > rightmostMatchFailuresPos) {
          rightmostMatchFailuresPos = pos;
          rightmostMatchFailuresExpected = [];
        }
        
        rightmostMatchFailuresExpected.push(failure);
      }
      
      function parse_start() {
        var cacheKey = 'start@' + pos;
        var cachedResult = cache[cacheKey];
        if (cachedResult) {
          pos = cachedResult.nextPos;
          return cachedResult.result;
        }
        
        
        var savedPos0 = pos;
        var result1 = [];
        var result5 = parse_Line();
        if (result5 !== null) {
          var result3 = result5;
        } else {
          var result4 = parse_BlankLine();
          if (result4 !== null) {
            var result3 = result4;
          } else {
            var result3 = null;;
          };
        }
        while (result3 !== null) {
          result1.push(result3);
          var result5 = parse_Line();
          if (result5 !== null) {
            var result3 = result5;
          } else {
            var result4 = parse_BlankLine();
            if (result4 !== null) {
              var result3 = result4;
            } else {
              var result3 = null;;
            };
          }
        }
        var result2 = result1 !== null
          ? (function(lines) {
              return {
                type: 'markdown',
                description: lines.join('')
              }
            })(result1)
          : null;
        if (result2 !== null) {
          var result0 = result2;
        } else {
          var result0 = null;
          pos = savedPos0;
        }
        
        
        
        cache[cacheKey] = {
          nextPos: pos,
          result:  result0
        };
        return result0;
      }
      
      function parse_Line() {
        var cacheKey = 'Line@' + pos;
        var cachedResult = cache[cacheKey];
        if (cachedResult) {
          pos = cachedResult.nextPos;
          return cachedResult.result;
        }
        
        
        var savedPos0 = pos;
        var savedPos1 = pos;
        var result6 = parse_LineChar();
        if (result6 !== null) {
          var result3 = [];
          while (result6 !== null) {
            result3.push(result6);
            var result6 = parse_LineChar();
          }
        } else {
          var result3 = null;
        }
        if (result3 !== null) {
          var result5 = parse_LineTerminatorSequence();
          var result4 = result5 !== null ? result5 : '';
          if (result4 !== null) {
            var result1 = [result3, result4];
          } else {
            var result1 = null;
            pos = savedPos1;
          }
        } else {
          var result1 = null;
          pos = savedPos1;
        }
        var result2 = result1 !== null
          ? (function(chars, newline) {
              return chars.join('') + newline;
            })(result1[0], result1[1])
          : null;
        if (result2 !== null) {
          var result0 = result2;
        } else {
          var result0 = null;
          pos = savedPos0;
        }
        
        
        
        cache[cacheKey] = {
          nextPos: pos,
          result:  result0
        };
        return result0;
      }
      
      function parse_BlankLine() {
        var cacheKey = 'BlankLine@' + pos;
        var cachedResult = cache[cacheKey];
        if (cachedResult) {
          pos = cachedResult.nextPos;
          return cachedResult.result;
        }
        
        
        var savedPos0 = pos;
        var result1 = parse_LineTerminatorSequence();
        var result2 = result1 !== null
          ? (function(newLine) {
              return newLine;
            })(result1)
          : null;
        if (result2 !== null) {
          var result0 = result2;
        } else {
          var result0 = null;
          pos = savedPos0;
        }
        
        
        
        cache[cacheKey] = {
          nextPos: pos,
          result:  result0
        };
        return result0;
      }
      
      function parse_LineChar() {
        var cacheKey = 'LineChar@' + pos;
        var cachedResult = cache[cacheKey];
        if (cachedResult) {
          pos = cachedResult.nextPos;
          return cachedResult.result;
        }
        
        
        var savedPos0 = pos;
        var savedPos1 = pos;
        var savedPos2 = pos;
        var savedReportMatchFailuresVar0 = reportMatchFailures;
        reportMatchFailures = false;
        var result5 = parse_LineTerminatorSequence();
        reportMatchFailures = savedReportMatchFailuresVar0;
        if (result5 === null) {
          var result3 = '';
        } else {
          var result3 = null;
          pos = savedPos2;
        }
        if (result3 !== null) {
          if (input.length > pos) {
            var result4 = input.charAt(pos);
            pos++;
          } else {
            var result4 = null;
            if (reportMatchFailures) {
              matchFailed('any character');
            }
          }
          if (result4 !== null) {
            var result1 = [result3, result4];
          } else {
            var result1 = null;
            pos = savedPos1;
          }
        } else {
          var result1 = null;
          pos = savedPos1;
        }
        var result2 = result1 !== null
          ? (function(char) {
              return char;
            })(result1[1])
          : null;
        if (result2 !== null) {
          var result0 = result2;
        } else {
          var result0 = null;
          pos = savedPos0;
        }
        
        
        
        cache[cacheKey] = {
          nextPos: pos,
          result:  result0
        };
        return result0;
      }
      
      function parse_Any() {
        var cacheKey = 'Any@' + pos;
        var cachedResult = cache[cacheKey];
        if (cachedResult) {
          pos = cachedResult.nextPos;
          return cachedResult.result;
        }
        
        
        var savedPos0 = pos;
        var result4 = parse_Blank();
        if (result4 !== null) {
          var result1 = result4;
        } else {
          var result3 = parse_NonBlank();
          if (result3 !== null) {
            var result1 = result3;
          } else {
            var result1 = null;;
          };
        }
        var result2 = result1 !== null
          ? (function(char) {
              return char;
            })(result1)
          : null;
        if (result2 !== null) {
          var result0 = result2;
        } else {
          var result0 = null;
          pos = savedPos0;
        }
        
        
        
        cache[cacheKey] = {
          nextPos: pos,
          result:  result0
        };
        return result0;
      }
      
      function parse_Blank() {
        var cacheKey = 'Blank@' + pos;
        var cachedResult = cache[cacheKey];
        if (cachedResult) {
          pos = cachedResult.nextPos;
          return cachedResult.result;
        }
        
        
        var savedPos0 = pos;
        var result4 = parse_WhiteSpace();
        if (result4 !== null) {
          var result1 = result4;
        } else {
          var result3 = parse_LineTerminatorSequence();
          if (result3 !== null) {
            var result1 = result3;
          } else {
            var result1 = null;;
          };
        }
        var result2 = result1 !== null
          ? (function(ws) {return ws;})(result1)
          : null;
        if (result2 !== null) {
          var result0 = result2;
        } else {
          var result0 = null;
          pos = savedPos0;
        }
        
        
        
        cache[cacheKey] = {
          nextPos: pos,
          result:  result0
        };
        return result0;
      }
      
      function parse_NonBlank() {
        var cacheKey = 'NonBlank@' + pos;
        var cachedResult = cache[cacheKey];
        if (cachedResult) {
          pos = cachedResult.nextPos;
          return cachedResult.result;
        }
        
        
        var savedPos0 = pos;
        var savedPos1 = pos;
        var savedPos2 = pos;
        var savedReportMatchFailuresVar0 = reportMatchFailures;
        reportMatchFailures = false;
        var result7 = parse_WhiteSpace();
        if (result7 !== null) {
          var result5 = result7;
        } else {
          var result6 = parse_LineTerminatorSequence();
          if (result6 !== null) {
            var result5 = result6;
          } else {
            var result5 = null;;
          };
        }
        reportMatchFailures = savedReportMatchFailuresVar0;
        if (result5 === null) {
          var result3 = '';
        } else {
          var result3 = null;
          pos = savedPos2;
        }
        if (result3 !== null) {
          if (input.length > pos) {
            var result4 = input.charAt(pos);
            pos++;
          } else {
            var result4 = null;
            if (reportMatchFailures) {
              matchFailed('any character');
            }
          }
          if (result4 !== null) {
            var result1 = [result3, result4];
          } else {
            var result1 = null;
            pos = savedPos1;
          }
        } else {
          var result1 = null;
          pos = savedPos1;
        }
        var result2 = result1 !== null
          ? (function(char) {return char;})(result1[1])
          : null;
        if (result2 !== null) {
          var result0 = result2;
        } else {
          var result0 = null;
          pos = savedPos0;
        }
        
        
        
        cache[cacheKey] = {
          nextPos: pos,
          result:  result0
        };
        return result0;
      }
      
      function parse_Identifier() {
        var cacheKey = 'Identifier@' + pos;
        var cachedResult = cache[cacheKey];
        if (cachedResult) {
          pos = cachedResult.nextPos;
          return cachedResult.result;
        }
        
        
        var savedPos0 = pos;
        var savedPos1 = pos;
        var result3 = parse_IdentifierStart();
        if (result3 !== null) {
          var result4 = [];
          var result5 = parse_IdentifierChar();
          while (result5 !== null) {
            result4.push(result5);
            var result5 = parse_IdentifierChar();
          }
          if (result4 !== null) {
            var result1 = [result3, result4];
          } else {
            var result1 = null;
            pos = savedPos1;
          }
        } else {
          var result1 = null;
          pos = savedPos1;
        }
        var result2 = result1 !== null
          ? (function(start, rest) {return start + rest.join('');})(result1[0], result1[1])
          : null;
        if (result2 !== null) {
          var result0 = result2;
        } else {
          var result0 = null;
          pos = savedPos0;
        }
        
        
        
        cache[cacheKey] = {
          nextPos: pos,
          result:  result0
        };
        return result0;
      }
      
      function parse_IdentifierStart() {
        var cacheKey = 'IdentifierStart@' + pos;
        var cachedResult = cache[cacheKey];
        if (cachedResult) {
          pos = cachedResult.nextPos;
          return cachedResult.result;
        }
        
        
        if (input.substr(pos).match(/^[a-zA-Z_]/) !== null) {
          var result0 = input.charAt(pos);
          pos++;
        } else {
          var result0 = null;
          if (reportMatchFailures) {
            matchFailed("[a-zA-Z_]");
          }
        }
        
        
        
        cache[cacheKey] = {
          nextPos: pos,
          result:  result0
        };
        return result0;
      }
      
      function parse_IdentifierChar() {
        var cacheKey = 'IdentifierChar@' + pos;
        var cachedResult = cache[cacheKey];
        if (cachedResult) {
          pos = cachedResult.nextPos;
          return cachedResult.result;
        }
        
        
        if (input.substr(pos).match(/^[a-zA-Z_0-9]/) !== null) {
          var result0 = input.charAt(pos);
          pos++;
        } else {
          var result0 = null;
          if (reportMatchFailures) {
            matchFailed("[a-zA-Z_0-9]");
          }
        }
        
        
        
        cache[cacheKey] = {
          nextPos: pos,
          result:  result0
        };
        return result0;
      }
      
      function parse__() {
        var cacheKey = '_@' + pos;
        var cachedResult = cache[cacheKey];
        if (cachedResult) {
          pos = cachedResult.nextPos;
          return cachedResult.result;
        }
        
        
        var result0 = [];
        var result1 = parse_WhiteSpace();
        while (result1 !== null) {
          result0.push(result1);
          var result1 = parse_WhiteSpace();
        }
        
        
        
        cache[cacheKey] = {
          nextPos: pos,
          result:  result0
        };
        return result0;
      }
      
      function parse___() {
        var cacheKey = '__@' + pos;
        var cachedResult = cache[cacheKey];
        if (cachedResult) {
          pos = cachedResult.nextPos;
          return cachedResult.result;
        }
        
        
        var result0 = [];
        var result3 = parse_WhiteSpace();
        if (result3 !== null) {
          var result1 = result3;
        } else {
          var result2 = parse_LineTerminatorSequence();
          if (result2 !== null) {
            var result1 = result2;
          } else {
            var result1 = null;;
          };
        }
        while (result1 !== null) {
          result0.push(result1);
          var result3 = parse_WhiteSpace();
          if (result3 !== null) {
            var result1 = result3;
          } else {
            var result2 = parse_LineTerminatorSequence();
            if (result2 !== null) {
              var result1 = result2;
            } else {
              var result1 = null;;
            };
          }
        }
        
        
        
        cache[cacheKey] = {
          nextPos: pos,
          result:  result0
        };
        return result0;
      }
      
      function parse_WhiteSpace() {
        var cacheKey = 'WhiteSpace@' + pos;
        var cachedResult = cache[cacheKey];
        if (cachedResult) {
          pos = cachedResult.nextPos;
          return cachedResult.result;
        }
        
        var savedReportMatchFailures = reportMatchFailures;
        reportMatchFailures = false;
        if (input.substr(pos).match(/^[	 \xA0\uFEFF]/) !== null) {
          var result2 = input.charAt(pos);
          pos++;
        } else {
          var result2 = null;
          if (reportMatchFailures) {
            matchFailed("[	 \\xA0\\uFEFF]");
          }
        }
        if (result2 !== null) {
          var result0 = result2;
        } else {
          var result1 = parse_Zs();
          if (result1 !== null) {
            var result0 = result1;
          } else {
            var result0 = null;;
          };
        }
        reportMatchFailures = savedReportMatchFailures;
        if (reportMatchFailures && result0 === null) {
          matchFailed("whitespace");
        }
        
        cache[cacheKey] = {
          nextPos: pos,
          result:  result0
        };
        return result0;
      }
      
      function parse_LineTerminatorSequence() {
        var cacheKey = 'LineTerminatorSequence@' + pos;
        var cachedResult = cache[cacheKey];
        if (cachedResult) {
          pos = cachedResult.nextPos;
          return cachedResult.result;
        }
        
        var savedReportMatchFailures = reportMatchFailures;
        reportMatchFailures = false;
        if (input.substr(pos, 1) === "\n") {
          var result5 = "\n";
          pos += 1;
        } else {
          var result5 = null;
          if (reportMatchFailures) {
            matchFailed("\"\\n\"");
          }
        }
        if (result5 !== null) {
          var result0 = result5;
        } else {
          if (input.substr(pos, 2) === "\r\n") {
            var result4 = "\r\n";
            pos += 2;
          } else {
            var result4 = null;
            if (reportMatchFailures) {
              matchFailed("\"\\r\\n\"");
            }
          }
          if (result4 !== null) {
            var result0 = result4;
          } else {
            if (input.substr(pos, 1) === "\r") {
              var result3 = "\r";
              pos += 1;
            } else {
              var result3 = null;
              if (reportMatchFailures) {
                matchFailed("\"\\r\"");
              }
            }
            if (result3 !== null) {
              var result0 = result3;
            } else {
              if (input.substr(pos, 1) === "\u2028") {
                var result2 = "\u2028";
                pos += 1;
              } else {
                var result2 = null;
                if (reportMatchFailures) {
                  matchFailed("\"\\u2028\"");
                }
              }
              if (result2 !== null) {
                var result0 = result2;
              } else {
                if (input.substr(pos, 1) === "\u2029") {
                  var result1 = "\u2029";
                  pos += 1;
                } else {
                  var result1 = null;
                  if (reportMatchFailures) {
                    matchFailed("\"\\u2029\"");
                  }
                }
                if (result1 !== null) {
                  var result0 = result1;
                } else {
                  var result0 = null;;
                };
              };
            };
          };
        }
        reportMatchFailures = savedReportMatchFailures;
        if (reportMatchFailures && result0 === null) {
          matchFailed("end of line");
        }
        
        cache[cacheKey] = {
          nextPos: pos,
          result:  result0
        };
        return result0;
      }
      
      function parse_Zs() {
        var cacheKey = 'Zs@' + pos;
        var cachedResult = cache[cacheKey];
        if (cachedResult) {
          pos = cachedResult.nextPos;
          return cachedResult.result;
        }
        
        
        if (input.substr(pos).match(/^[ \xA0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000]/) !== null) {
          var result0 = input.charAt(pos);
          pos++;
        } else {
          var result0 = null;
          if (reportMatchFailures) {
            matchFailed("[ \\xA0\\u1680\\u180E\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200A\\u202F\\u205F\\u3000]");
          }
        }
        
        
        
        cache[cacheKey] = {
          nextPos: pos,
          result:  result0
        };
        return result0;
      }
      
      function buildErrorMessage() {
        function buildExpected(failuresExpected) {
          failuresExpected.sort();
          
          var lastFailure = null;
          var failuresExpectedUnique = [];
          for (var i = 0; i < failuresExpected.length; i++) {
            if (failuresExpected[i] !== lastFailure) {
              failuresExpectedUnique.push(failuresExpected[i]);
              lastFailure = failuresExpected[i];
            }
          }
          
          switch (failuresExpectedUnique.length) {
            case 0:
              return 'end of input';
            case 1:
              return failuresExpectedUnique[0];
            default:
              return failuresExpectedUnique.slice(0, failuresExpectedUnique.length - 1).join(', ')
                + ' or '
                + failuresExpectedUnique[failuresExpectedUnique.length - 1];
          }
        }
        
        var expected = buildExpected(rightmostMatchFailuresExpected);
        var actualPos = Math.max(pos, rightmostMatchFailuresPos);
        var actual = actualPos < input.length
          ? quote(input.charAt(actualPos))
          : 'end of input';
        
        return 'Expected ' + expected + ' but ' + actual + ' found.';
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
        
        for (var i = 0; i <  rightmostMatchFailuresPos; i++) {
          var ch = input.charAt(i);
          if (ch === '\n') {
            if (!seenCR) { line++; }
            column = 1;
            seenCR = false;
          } else if (ch === '\r' | ch === '\u2028' || ch === '\u2029') {
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
      
      
      
      var result = parseFunctions[startRule]();
      
      /*
       * The parser is now in one of the following three states:
       *
       * 1. The parser successfully parsed the whole input.
       *
       *    - |result !== null|
       *    - |pos === input.length|
       *    - |rightmostMatchFailuresExpected| may or may not contain something
       *
       * 2. The parser successfully parsed only a part of the input.
       *
       *    - |result !== null|
       *    - |pos < input.length|
       *    - |rightmostMatchFailuresExpected| may or may not contain something
       *
       * 3. The parser did not successfully parse any part of the input.
       *
       *   - |result === null|
       *   - |pos === 0|
       *   - |rightmostMatchFailuresExpected| contains at least one failure
       *
       * All code following this comment (including called functions) must
       * handle these states.
       */
      if (result === null || pos !== input.length) {
        var errorPosition = computeErrorPosition();
        throw new this.SyntaxError(
          buildErrorMessage(),
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
  
  result.SyntaxError = function(message, line, column) {
    this.name = 'SyntaxError';
    this.message = message;
    this.line = line;
    this.column = column;
  };
  
  result.SyntaxError.prototype = Error.prototype;
  
  return result;
})()