let autoplayEnabled = null;

/**
 * DEVELOPER WARNING: IMPORTING THIS LIBRARY MAY MAKE YOUR ADAPTER NO LONGER COMPATIBLE WITH APP PUBLISHERS USING WKWEBVIEW
 * Note: this function returns true if detection is not done yet. This is by design: if autoplay is not allowed,
 * the call to video.play() will fail immediately, otherwise it may not terminate.
 * @returns true if autoplay is not forbidden
 */
export const isAutoplayEnabled = () => autoplayEnabled !== false;

// generated with:
// ask ChatGPT for a 160x90 black PNG image (1/8th the size of 720p)
//
// encode with:
// ffmpeg -i black_image_160x90.png -r 1 -c:v libx264 -bsf:v 'filter_units=remove_types=6' -pix_fmt yuv420p autoplay.mp4
// this creates a 1 second long, 1 fps YUV 4:2:0 video encoded with H.264 without encoder details.
//
// followed by:
// echo "data:video/mp4;base64,$(base64 -i autoplay.mp4)"

const autoplayVideoUrl =
  'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAADxtZGF0AAAAMGWIhAAV//73ye/Apuvb3rW/k89I/Cy3PsIqP39atohOSV14BYa1heKCYgALQC5K4QAAAwZtb292AAAAbG12aGQAAAAAAAAAAAAAAAAAAAPoAAAD6AABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAACMHRyYWsAAABcdGtoZAAAAAMAAAAAAAAAAAAAAAEAAAAAAAAD6AAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAoAAAAFoAAAAAACRlZHRzAAAAHGVsc3QAAAAAAAAAAQAAA+gAAAAAAAEAAAAAAahtZGlhAAAAIG1kaGQAAAAAAAAAAAAAAAAAAEAAAABAAFXEAAAAAAAtaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAFZpZGVvSGFuZGxlcgAAAAFTbWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAABE3N0YmwAAACvc3RzZAAAAAAAAAABAAAAn2F2YzEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAoABaAEgAAABIAAAAAAAAAAEVTGF2YzYwLjMxLjEwMiBsaWJ4MjY0AAAAAAAAAAAAAAAY//8AAAA1YXZjQwFkAAr/4QAYZ2QACqzZQo35IQAAAwABAAADAAIPEiWWAQAGaOvjyyLA/fj4AAAAABRidHJ0AAAAAAAAAaAAAAGgAAAAGHN0dHMAAAAAAAAAAQAAAAEAAEAAAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAABAAAAAQAAABRzdHN6AAAAAAAAADQAAAABAAAAFHN0Y28AAAAAAAAAAQAAADAAAABidWR0YQAAAFptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAC1pbHN0AAAAJal0b28AAAAdZGF0YQAAAAEAAAAATGF2ZjYwLjE2LjEwMA==';

function startDetection() {
  // we create an HTMLVideoElement muted and not displayed in which we try to play a one frame video
  const videoElement = document.createElement('video');
  videoElement.src = autoplayVideoUrl;
  videoElement.setAttribute('playsinline', 'true');
  videoElement.muted = true;

  videoElement
    .play()
    .then(() => {
      autoplayEnabled = true;
      videoElement.pause();
    })
    .catch(() => {
      autoplayEnabled = false;
    });
}

// starts detection as soon as this library is loaded
startDetection();
