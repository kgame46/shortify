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

  // Separate inputs: file upload and URL input
  const fileInput = document.getElementById('videoUpload');
  const textInput = document.getElementById('videoUrlInput');
  const processButton = document.getElementById('processBtn');
  const progressBar = document.getElementById('progressBar');
  const progressElem = progressBar.querySelector('.progress');
  const resultContainer = document.getElementById('result');
  const outputVideo = document.getElementById('outputVideo');
  const downloadLink = document.getElementById('downloadLink');

  // Display progress bar and update width
  function showProgress(ratio) {
    progressBar.style.display = 'block';
    progressElem.style.width = `${(ratio * 100).toFixed(2)}%`;
  }

  // When a user selects a file, clear the URL input and optionally display the file name
  if (fileInput && textInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        const selected = fileInput.files[0];
        // Display the selected file name for clarity
        textInput.value = '';
        fileInput.nextElementSibling.textContent = selected.name;
      } else {
        // Reset label if no file selected
        fileInput.nextElementSibling.textContent = 'Select file';
      }
    });
  }

  processButton.addEventListener('click', async () => {
    // Validate that either a file or a URL has been provided
    const fileSelected = fileInput && fileInput.files && fileInput.files.length > 0;
    const urlProvided = textInput && textInput.value.trim() !== '';
    if (!fileSelected && !urlProvided) {
      alert('Please select a video to process or paste a video link.');
      return;
    }
    let file;
    if (fileSelected) {
      // Use the uploaded file directly
      file = fileInput.files[0];
    } else {
      // Attempt to fetch the video from the provided URL
      const videoUrl = textInput.value.trim();
      try {
        const response = await fetch(videoUrl);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const blob = await response.blob();
        // Derive a filename from the URL or default to input.mp4
        const urlParts = videoUrl.split('/');
        const lastPart = urlParts[urlParts.length - 1] || 'input.mp4';
        const filename = lastPart.includes('.') ? lastPart : `${lastPart}.mp4`;
        file = new File([blob], filename, { type: blob.type || 'video/mp4' });
      } catch (err) {
        console.error(err);
        alert('Unable to fetch video from the provided URL. Please ensure the link is direct to a video file or try another link.');
        processButton.disabled = false;
        processButton.textContent = 'Generate short';
        return;
      }
    }
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

  // Attach click handlers to pricing plan buttons. Each plan has a button within
  // its `.plan` container. When a user selects a plan we provide immediate
  // feedback and scroll them to the upload section.
  const pricingPlans = document.querySelectorAll('.pricing-plans .plan');
  pricingPlans.forEach(plan => {
    const btn = plan.querySelector('button');
    if (btn) {
      btn.addEventListener('click', () => {
        // Find the plan name from the heading inside the plan container.
        const planNameElem = plan.querySelector('h3');
        const planName = planNameElem ? planNameElem.textContent.trim() : '';
        alert('You selected the ' + planName + ' plan!');
        // Smoothly scroll to the upload section so the user can start uploading a video.
        const uploadSection = document.getElementById('upload');
        if (uploadSection) {
          uploadSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  });
});