var foo = {
  get bar() {
    return 'bar';
  },
  set bar(value) {
    this.baz = value;
  }
};