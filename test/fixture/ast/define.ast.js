module.exports = {
  "type": "script",
  "path": "define.js",
  "nodes": [
    {
      "type": "define-function",
      "nodes": [
        {
          "type": "name",
          "value": "foo",
          "pos": 9,
          "line": 1,
          "column": 10,
          "comments": []
        },
        {
          "type": "parameters",
          "nodes": [],
          "pos": 13,
          "line": 1,
          "column": 14,
          "comments": []
        },
        {
          "type": "nodes",
          "nodes": [],
          "pos": 16,
          "line": 1,
          "column": 17,
          "comments": []
        }
      ],
      "pos": 0,
      "comments": [],
      "line": 1,
      "column": 1
    },
    {
      "type": "define-function",
      "nodes": [
        {
          "type": "name",
          "value": "bar",
          "pos": 29,
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
              "pos": 33,
              "line": 4,
              "column": 14,
              "comments": []
            },
            {
              "type": "name",
              "value": "y",
              "pos": 36,
              "line": 4,
              "column": 17,
              "comments": []
            }
          ],
          "pos": 33,
          "line": 4,
          "column": 14,
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
                      "pos": 52,
                      "line": 5,
                      "column": 12,
                      "comments": []
                    },
                    {
                      "type": "name",
                      "value": "x",
                      "pos": 50,
                      "line": 5,
                      "column": 10,
                      "comments": []
                    },
                    {
                      "type": "name",
                      "value": "y",
                      "pos": 54,
                      "line": 5,
                      "column": 14,
                      "comments": []
                    }
                  ],
                  "pos": 50,
                  "line": 5,
                  "column": 10,
                  "comments": []
                }
              ],
              "pos": 43,
              "comments": [],
              "line": 5,
              "column": 3
            }
          ],
          "pos": 40,
          "line": 4,
          "column": 21,
          "comments": []
        }
      ],
      "pos": 20,
      "comments": [],
      "line": 4,
      "column": 1
    }
  ],
  "comments": []
};