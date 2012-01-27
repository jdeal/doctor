var foo = {x: 1, y: 2};
for (key in foo) {
  console.log(key);
}

for (var key in foo) {
  console.log(key);
}