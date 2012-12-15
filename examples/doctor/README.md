The doctor documentation is created using doctor. From the root of the doctor
source, you can run this:

```bash
mkdir output
doctor lib/*.js README.md examples/*/README.md TOC.md -v default -v doctor -o output --verbose
```

This reads all the source from lib, adds in the root README and all the example
README files, and uses the TOC.md file to create a custom table of contents.

The built-in default view and the doctor view are merged along with the
report.json file to the output directory.

The verbose option just prints out some debug info so you cna see what's going on.