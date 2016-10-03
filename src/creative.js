<script>
  var rendered = false;

  var renderAd = function (ev) {
    var key = ev.message ? "message" : "data";
    var data = {};
    try {
      data = JSON.parse(ev[key]);
    } catch (e) {
      // Do nothing.  No ad found.
    }
    if (!rendered && (data.ad || data.adUrl)) {
      rendered = true;
      if (data.ad) {
        document.write(data.ad);
        document.close();
      } else if (data.adUrl) {
        doc.write('<IFRAME SRC="' + data.adUrl + '" FRAMEBORDER="0" SCROLLING="no" MARGINHEIGHT="0" MARGINWIDTH="0" TOPMARGIN="0" LEFTMARGIN="0" ALLOWTRANSPARENCY="true"></IFRAME>');
        doc.close();
      }
    }
  };

  var requestAdFromPrebid = function () {
    var message = JSON.stringify({
      message: 'request ad',
      adId: '%%PATTERN:hb_adid%%'
    });
    window.parent.postMessage(message,"*");
  };

  var listenAdFromPrebid = function () {
    window.addEventListener("message", renderAd, false);
  };

  listenAdFromPrebid();
  requestAdFromPrebid();
</script>
