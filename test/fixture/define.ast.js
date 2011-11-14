module.exports = {
  "type": "file",
  "path": "define.js",
  "nodes": [
    {
      "type": "define",
      "nodes": [
        {
          "type": "name",
          "value": "foo"
        },
        {
          "type": "nodes",
          "nodes": []
        },
        {
          "type": "nodes",
          "nodes": []
        }
      ]
    },
    {
      "type": "define",
      "nodes": [
        {
          "type": "name",
          "value": "bar"
        },
        {
          "type": "nodes",
          "nodes": [
            {
              "type": "name",
              "value": "x"
            },
            {
              "type": "name",
              "value": "y"
            }
          ]
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
                      "type": "string",
                      "value": "*"
                    },
                    {
                      "type": "name",
                      "value": "x"
                    },
                    {
                      "type": "name",
                      "value": "y"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};