This example uses custom transform rules to remove debug code from the source.
Look at the AstNode class in doctor's API documentation for the manipulation
you can do to AST nodes. Here, the remove method is used to remove a function
call if the name of the function is "debug".

```js
rules.push({
  type: 'call',
  match: function (node) {
    return node.nodes[0].value === 'debug';
  },
  transform: function (node) {
    node.remove();
  }
});
```

The ast report rules are used to simply copy the ast into the report. The source
renderer is then used to convert the ast back into source code.

You can run the following command in examples/remove-debug to try it out.

```bash
doctor square.js -t transform.js --render source --report ast
```