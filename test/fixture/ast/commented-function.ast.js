module.exports = {
  "type": "script",
  "nodes": [
    {
      "type": "define-function",
      "nodes": [
        {
          "type": "name",
          "value": "square",
          "pos": 46,
          "line": 4,
          "column": 10,
          "comments": []
        },
        {
          "type": "parameters",
          "nodes": [
            {
              "type": "name",
              "value": "x",
              "pos": 53,
              "line": 4,
              "column": 17,
              "comments": []
            }
          ],
          "pos": 53,
          "line": 4,
          "column": 17,
          "comments": []
        },
        {
          "type": "nodes",
          "nodes": [
            {
              "type": "return",
              "nodes": [
                {
                  "type": "binary",
                  "nodes": [
                    {
                      "type": "operator",
                      "value": "*",
                      "pos": 69,
                      "line": 5,
                      "column": 12,
                      "comments": []
                    },
                    {
                      "type": "name",
                      "value": "x",
                      "pos": 67,
                      "line": 5,
                      "column": 10,
                      "comments": []
                    },
                    {
                      "type": "name",
                      "value": "x",
                      "pos": 71,
                      "line": 5,
                      "column": 14,
                      "comments": []
                    }
                  ],
                  "pos": 67,
                  "line": 5,
                  "column": 10,
                  "comments": []
                }
              ],
              "pos": 60,
              "comments": [],
              "line": 5,
              "column": 3
            }
          ],
          "pos": 57,
          "line": 4,
          "column": 21,
          "comments": []
        }
      ],
      "pos": 37,
      "comments": [
        "/*\n return the square of a number\n*/"
      ],
      "line": 4,
      "column": 1
    }
  ],
  "pos": 0,
  "comments": [],
  "line": 1,
  "column": 1,
  "grammarFile": "/Users/justin/Dropbox/git/doctor/grammar/javascript.pegjs",
  "path": "commented-function",
  "fullPath": "commented-function.js"
}
