module.exports = {
  "type": "script",
  "nodes": [
    {
      "type": "vars",
      "nodes": [
        {
          "type": "var",
          "nodes": [
            {
              "type": "name",
              "value": "x",
              "pos": 37,
              "line": 10,
              "column": 5,
              "comments": []
            },
            {
              "type": "number",
              "value": 1,
              "pos": 41,
              "line": 10,
              "column": 9,
              "comments": []
            }
          ],
          "pos": 37,
          "line": 10,
          "column": 5,
          "comments": []
        }
      ],
      "pos": 33,
      "comments": [
        "// thing"
      ],
      "line": 10,
      "column": 1
    },
    {
      "type": "define-function",
      "nodes": [
        {
          "type": "name",
          "value": "f",
          "pos": 61,
          "line": 13,
          "column": 10,
          "comments": []
        },
        {
          "type": "parameters",
          "nodes": [
            {
              "type": "name",
              "value": "x",
              "pos": 73,
              "line": 13,
              "column": 22,
              "comments": []
            }
          ],
          "pos": 73,
          "line": 13,
          "column": 22,
          "comments": []
        },
        {
          "type": "nodes",
          "nodes": [],
          "pos": 76,
          "line": 13,
          "column": 25,
          "comments": []
        }
      ],
      "pos": 52,
      "comments": [
        "// xyz"
      ],
      "line": 13,
      "column": 1
    },
    {
      "type": "define-function",
      "nodes": [
        {
          "type": "name",
          "value": "g",
          "pos": 97,
          "line": 18,
          "column": 10,
          "comments": []
        },
        {
          "type": "parameters",
          "nodes": [],
          "pos": 99,
          "line": 18,
          "column": 12,
          "comments": []
        },
        {
          "type": "nodes",
          "nodes": [],
          "pos": 101,
          "line": 18,
          "column": 14,
          "comments": []
        }
      ],
      "pos": 88,
      "comments": [
        "/*\n g\n*/"
      ],
      "line": 18,
      "column": 1
    }
  ],
  "pos": 23,
  "comments": [
    "/**\n x\n leader\n y\n*/"
  ],
  "line": 8,
  "column": 1,
  "grammarFile": "/Users/justin/Dropbox/git/doctor/grammar/javascript.pegjs",
  "path": "gaps",
  "fullPath": "gaps.js"
};