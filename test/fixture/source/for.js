for (i = 0; i < 10; i++) {
  console.log(i);
}

for (var i = 0; i < 10; i++) {
  console.log(i);
}

for (var byteValue = b.buffer[ ++curByte ], startBit = precisionBits % 8 || 8, mask = 1 << startBit; mask >>= 1; ( byteValue & mask ) && ( significand += 1 / divisor ), divisor *= 2 );