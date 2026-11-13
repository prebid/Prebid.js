(function () {
  var script = document.currentScript || document.querySelector('script[data-auction-response-id]');

  if (!script) {
    throw new Error('TripleLift creative stub could not find the response script');
  }

  var responseId = script.getAttribute('data-auction-response-id');
  var response = window['tl_auction_response_' + responseId];

  if (!response || !response.ad || !response.ad.display || !response.ad.display.adm) {
    throw new Error('TripleLift creative stub could not find the expected response payload');
  }

  var iframe = document.createElement('iframe');
  iframe.className = 'tl-iframe';
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('scrolling', 'no');
  iframe.style.border = '0';
  iframe.style.width = response.ad.display.w + 'px';
  iframe.style.height = response.ad.display.h + 'px';
  script.parentElement.appendChild(iframe);

  var doc = iframe.contentWindow.document;
  doc.open();
  doc.write(response.ad.display.adm);
  doc.close();
}());
