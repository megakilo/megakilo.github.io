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
  const [videoWidth, videoHeight] = normalize(videoDiag, videoWidthRatio, videoHeightRatio);

  resultsDiv.innerHTML += `<div class="result-section">`;
  resultsDiv.innerHTML += `<h3>Screen Dimensions</h3>`;
  resultsDiv.innerHTML += `<p><strong>Width:</strong> ${w.toFixed(2)}" &nbsp; <strong>Height:</strong> ${h.toFixed(2)}"</p>`;
  resultsDiv.innerHTML += `<p><strong>Area:</strong> ${area.toFixed(2)} sq in &nbsp; <strong>Diagonal:</strong> ${diag.toFixed(2)}"</p>`;
  resultsDiv.innerHTML += `</div>`;

  resultsDiv.innerHTML += `<div class="result-section">`;
  resultsDiv.innerHTML += `<h3>Video Dimensions</h3>`;
  resultsDiv.innerHTML += `<p><strong>Width:</strong> ${videoWidth.toFixed(2)}" &nbsp; <strong>Height:</strong> ${videoHeight.toFixed(2)}"</p>`;
  resultsDiv.innerHTML += `<p><strong>Area:</strong> ${videoArea.toFixed(2)} sq in &nbsp; <strong>Diagonal:</strong> ${videoDiag.toFixed(2)}"</p>`;
  resultsDiv.innerHTML += `</div>`;

  if (window.addToHistory) {
    window.addToHistory({
      diag, widthRatio, heightRatio, w, h, area, videoArea, videoDiag, videoWidth, videoHeight
    });
  }
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('presetRatios').addEventListener('change', function () {
    const selectedRatio = this.value;
    if (selectedRatio) {
      const [width, height] = selectedRatio.split(':');
      document.getElementById('widthRatio').value = width;
      document.getElementById('heightRatio').value = height;
    }
  });

  document.getElementById('presetVideoRatios').addEventListener('change', function () {
    const selectedRatio = this.value;
    if (selectedRatio) {
      const [width, height] = selectedRatio.split(':');
      document.getElementById('videoWidthRatio').value = width;
      document.getElementById('videoHeightRatio').value = height;
    }
  });

  document.getElementById('swapRatios').addEventListener('click', function () {
    const widthRatioInput = document.getElementById('widthRatio');
    const heightRatioInput = document.getElementById('heightRatio');

    const temp = widthRatioInput.value;
    widthRatioInput.value = heightRatioInput.value;
    heightRatioInput.value = temp;
  });

  document.getElementById('swapVideoRatios').addEventListener('click', function () {
    const videoWidthRatioInput = document.getElementById('videoWidthRatio');
    const videoHeightRatioInput = document.getElementById('videoHeightRatio');

    const temp = videoWidthRatioInput.value;
    videoWidthRatioInput.value = videoHeightRatioInput.value;
    videoHeightRatioInput.value = temp;
  });

  // History Feature
  let history = [];
  const historyContainer = document.getElementById('history-container');
  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clearHistory');

  function renderHistory() {
    if (history.length === 0) {
      historyContainer.style.display = 'none';
      return;
    }
    historyContainer.style.display = 'block';
    historyList.innerHTML = '';
    history.forEach((item, index) => {
      const historyItem = document.createElement('div');
      historyItem.style.borderBottom = '1px solid #eee';
      historyItem.style.padding = '10px 0';
      historyItem.style.fontSize = '0.9em';
      historyItem.innerHTML = `
                <div><strong>Run #${history.length - index}</strong> <span style="color: #888; font-size: 0.8em;">(${item.timestamp})</span></div>
                <div>Diag: ${item.diag}" | Ratio: ${item.widthRatio}:${item.heightRatio}</div>
                <div>Result: ${item.w.toFixed(2)}" x ${item.h.toFixed(2)}" (Area: ${item.area.toFixed(2)} sq in)</div>
                <div>Video: ${item.videoWidth.toFixed(2)}" x ${item.videoHeight.toFixed(2)}" (Area: ${item.videoArea.toFixed(2)} sq in; Diag: ${item.videoDiag.toFixed(2)}")</div>
            `;
      historyList.appendChild(historyItem);
    });
  }

  clearHistoryBtn.addEventListener('click', function () {
    history = [];
    renderHistory();
  });

  // Expose addToHistory to be called from calculateScreenProperties
  window.addToHistory = function (result) {
    const now = new Date();
    const timestamp = now.toLocaleTimeString();
    history.unshift({ ...result, timestamp });
    if (history.length > 10) history.pop(); // Keep last 10
    renderHistory();
  };
});
