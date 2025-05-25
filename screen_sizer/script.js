function area(diag, w, h) {
  if (w === 0 && h === 0) return 0;
  return (diag * diag * w * h) / (w * w + h * h);
}

function movie_area(diag, w, h) {
  if (h === 0) return 0; 
  return area(diag, w, h) * (w / 16 * 9) / h;
}

function vertical_movie_area(diag, w, h) {
  const l = Math.max(w, h);
  const s = Math.min(w, h);
  if (l === 0) return 0;
  return area(diag, w, h) * (s / 16 * 9) / l;
}

function screen_size(diag, w, h) {
  const denominator = Math.sqrt(w * w + h * h);
  if (denominator === 0) {
    return [0.00, 0.00];
  }
  const w_actual = (w * diag) / denominator;
  const h_actual = (h * diag) / denominator;
  return [w_actual, h_actual];
}

function calculateScreenProperties() {
  const diag = parseFloat(document.getElementById('diag').value);
  const widthRatio = parseFloat(document.getElementById('widthRatio').value);
  const heightRatio = parseFloat(document.getElementById('heightRatio').value);

  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = ''; // Clear previous results

  if (isNaN(diag) || isNaN(widthRatio) || isNaN(heightRatio)) {
    resultsDiv.innerHTML = '<p style="color: red;">Please enter valid numbers for all fields.</p>';
    return;
  }
  if (widthRatio <= 0 || heightRatio <= 0) {
    resultsDiv.innerHTML = '<p style="color: red;">Width and Height ratios must be positive.</p>';
    return;
  }


  const [w, h] = screen_size(diag, widthRatio, heightRatio);
  const calculatedArea = area(diag, widthRatio, heightRatio);
  const calculatedMovieArea = movie_area(diag, widthRatio, heightRatio);
  const calculatedVerticalMovieArea = vertical_movie_area(diag, widthRatio, heightRatio);
  const calculatedMaxMovieArea = Math.max(calculatedMovieArea, calculatedVerticalMovieArea);

  resultsDiv.innerHTML += `<p><strong>Diagonal:</strong> ${diag}</p>`;
  resultsDiv.innerHTML += `<p><strong>Width:</strong> ${w.toFixed(2)}</p>`;
  resultsDiv.innerHTML += `<p><strong>Height:</strong> ${h.toFixed(2)}</p>`;
  resultsDiv.innerHTML += `<p><strong>Area:</strong> ${calculatedArea.toFixed(2)}</p>`;
  resultsDiv.innerHTML += `<p><strong>Movie Area (16:9 crop):</strong> ${calculatedMovieArea.toFixed(2)}</p>`;
  resultsDiv.innerHTML += `<p><strong>Max Movie Area (fit 16:9):</strong> ${calculatedMaxMovieArea.toFixed(2)}</p>`;
  resultsDiv.innerHTML += `<p><strong>Vertical Movie Area (9:16 crop):</strong> ${calculatedVerticalMovieArea.toFixed(2)}</p>`;
}

// Optional: Calculate on initial load if default values are set and desired
// window.onload = calculateScreenProperties;