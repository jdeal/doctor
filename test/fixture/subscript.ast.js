module.exports = {
  "type": "file",
  "path": "subscript.js",
  "nodes": [
    {
      "type": "assign",
      "nodes": [
        {
          "type": "subscript",
          "nodes": [
            {
              "type": "name",
              "value": "a"
            },
            {
              "type": "number",
              "value": 0
            }
          ]
        },
        {
          "type": "number",
          "value": 1
        }
      ]
    },
    {
      "type": "assign",
      "nodes": [
        {
          "type": "subscript",
          "nodes": [
            {
              "type": "name",
              "value": "a"
            },
            {
              "type": "string",
              "value": "x"
            }
          ]
        },
        {
          "type": "string",
          "value": "y"
        }
      ]
    }
  ]
};