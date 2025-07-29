/*
 * app.js – client side logic for Shortify
 *
 * This script handles video uploads and uses ffmpeg.wasm to generate a short
 * clip from the first 30 seconds of the input. It displays a progress bar
 * while transcoding and reveals the resulting video along with a download
 * link once processing is complete.
 */

// Ensure the DOM is ready before binding events
document.addEventListener('DOMContentLoaded', () => {
  const { createFFmpeg, fetchFile } = FFmpeg;
  const ffmpeg = createFFmpeg({ log: true });

  const uploadInput = document.getElementById('videoUpload');
  const processButton = document.getElementById('processBtn');
  const progressBar = document.getElementById('progressBar');
  const progressElem = progressBar.querySelector('.progress');
  const resultContainer = document.getElementById('result');
  const outputVideo = document.getElementById('outputVideo');
      // Attach click handlers to pricing plan buttons
  const pricingPlans = document.querySelectorAll('.pricing-plans .plan');
  pricingPlans.forEach(plan => {
    const btn = plan.querySelector('button');
    if (btn) {
      btn.addEventListener('click', () => {
        const planNameElem = plan.querySelector('h3');
        const planName = planNameElem ? planNameElem.textContent.trim() : '';
        alert('You selected the ' + planName + ' plan!');
        const uploadSection = document.getElementById('upload');
        if (uploadSection) {
          uploadSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  });
coconst downloadLink = document.getElementById('downloadLink');

  // Display progress bar and update width
  function showProgress(ratio) {
    progressBar.style.display = 'block';
    progressElem.style.width = `${(ratio * 100).toFixed(2)}%`;
  }

  processButton.addEventListener('click', async () => {
    // validate file selection
    if (!uploadInput.files || uploadInput.files.length === 0) {
      alert('Please select a video to process.');
      return;
    }
    const file = uploadInput.files[0];
    // disable UI while working
    processButton.disabled = true;
    processButton.textContent = 'Processing...';
    resultContainer.style.display = 'none';
    showProgress(0);
    try {
      // Load ffmpeg if not already
      if (!ffmpeg.isLoaded()) {
        await ffmpeg.load();
      }
      // Hook into progress callbacks
      ffmpeg.setProgress(({ ratio }) => {
        showProgress(ratio);
      });
      // Write file into the virtual FS
      ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file));
      // Transcode: trim to 30 seconds and convert to mp4 at 720p
      await ffmpeg.run(
        '-i',
        'input.mp4',
        '-t',
        '00:00:30',
        '-vf',
        'scale=720:-2',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-movflags',
        'faststart',
        'output.mp4'
      );
      // Read result
      const data = ffmpeg.FS('readFile', 'output.mp4');
      const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(videoBlob);
      // Display result
      outputVideo.src = url;
      downloadLink.href = url;
      resultContainer.style.display = 'block';
    } catch (err) {
      console.error(err);
      alert('An error occurred while processing the video. Please try another file.');
    } finally {
      processButton.disabled = false;
      processButton.textContent = 'Generate short';
      // hide progress bar after completion
      setTimeout(() => {
        progressBar.style.display = 'none';
        progressElem.style.width = '0%';
      }, 1000);
    }
  });
});
