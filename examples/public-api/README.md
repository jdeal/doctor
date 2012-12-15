This example creates a report from a CommonJS package, using doctor's default
rules. A factory function is exported, so to document the associated class, the
@public tag is used on the constructor.

You can run the following command in examples/public-api to try it out.

```bash
doctor greeter/package.json
```