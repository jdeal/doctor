This example counts the number of times console.log appears in the source. This
could be useful if you want to check for unwanted console.log statements during
your build process.

From the doctor source, in the examples/count-console-log directory, run this
command:

```bash
doctor foo.js -r report --verbose
```

Note that the default rules are disabled and overridden by the rules in
report.js.