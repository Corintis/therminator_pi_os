module.exports = function normalizeMatrix(matrix) {
  let min = Infinity;
  let max = -Infinity;

  // Find min and max
  matrix.forEach((row) => {
    row.forEach((val) => {
      if (val < min) min = val;
      if (val > max) max = val;
    });
  });

  // Avoid divide-by-zero
  if (min === max) {
    return matrix.map((row) => row.map(() => 0.5)); // All the same value
  }

  // Normalize
  return matrix.map((row) => row.map((val) => (val - min) / (max - min)));
}
