function videoDimensions(w, h, videoWidthRatio, videoHeightRatio) {
  if (videoWidthRatio * h > w * videoHeightRatio) {
    const ratio = videoHeightRatio / h * w / videoWidthRatio;
    const videoDiag = ((ratio * h) ** 2 + w ** 2) ** 0.5;
    return [w * h * ratio, videoDiag];
  } else {
    const ratio = videoWidthRatio / w * h / videoHeightRatio;
    const videoDiag = (h ** 2 + (ratio * w) ** 2) ** 0.5;
    return [w * h * ratio, videoDiag];
  }
}

function normalize(diag, w, h) {
  const denominator = (w * w + h * h) ** 0.5;
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
  const videoWidthRatio = parseFloat(document.getElementById('videoWidthRatio').value);
  const videoHeightRatio = parseFloat(document.getElementById('videoHeightRatio').value);

  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = ''; // Clear previous results

  if (isNaN(diag) || isNaN(widthRatio) || isNaN(heightRatio) || isNaN(videoWidthRatio) || isNaN(videoHeightRatio)) {
    resultsDiv.innerHTML = '<p style="color: red;">Please enter valid numbers for all fields.</p>';
    return;
  }
  if (widthRatio <= 0 || heightRatio <= 0 || videoWidthRatio <= 0 || videoHeightRatio <= 0) {
    resultsDiv.innerHTML = '<p style="color: red;">Width and Height ratios must be positive.</p>';
    return;
  }


  const [w, h] = normalize(diag, widthRatio, heightRatio);
  const area = w * h;
  const [videoArea, videoDiag] = videoDimensions(w, h, videoWidthRatio, videoHeightRatio);

  resultsDiv.innerHTML += `<p><strong>Width:</strong> ${w.toFixed(2)}; <strong>Height:</strong> ${h.toFixed(2)}</p>`;
  resultsDiv.innerHTML += `<p><strong>Screen Area:</strong> ${area.toFixed(2)}; <strong>Diagonal:</strong> ${diag.toFixed(2)}</p>`;
  resultsDiv.innerHTML += `<p><strong>Video Area:</strong> ${videoArea.toFixed(2)}; <strong>Video Diagonal:</strong> ${videoDiag.toFixed(2)}</p>`;
}
