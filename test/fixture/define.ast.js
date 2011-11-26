module.exports = {
  "type": "file",
  "path": "define.js",
  "nodes": [
    {
      "type": "define-function",
      "nodes": [
        {
          "type": "name",
          "value": "foo",
          "comments": []
        },
        {
          "type": "parameters",
          "nodes": [],
          "comments": []
        },
        {
          "type": "nodes",
          "nodes": [],
          "comments": []
        }
      ],
      "comments": []
    },
    {
      "type": "define-function",
      "nodes": [
        {
          "type": "name",
          "value": "bar",
          "comments": []
        },
        {
          "type": "parameters",
          "nodes": [
            {
              "type": "name",
              "value": "x",
              "comments": []
            },
            {
              "type": "name",
              "value": "y",
              "comments": []
            }
          ],
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
                      "comments": []
                    },
                    {
                      "type": "name",
                      "value": "x",
                      "comments": []
                    },
                    {
                      "type": "name",
                      "value": "y",
                      "comments": []
                    }
                  ],
                  "comments": []
                }
              ],
              "comments": []
            }
          ],
          "comments": []
        }
      ],
      "comments": []
    }
  ],
  "comments": []
};