module.exports = {
  findIframeInDiv : function(divid) {
    var div = document.getElementById(divid);
    var iframes = div.getElementsByTagName('iframe');
    try {
      if(iframes.length == 1 && iframes[0].contentWindow.document.body.innerHTML == "") {
        return false;
      } else {
        return true;
      }
    } catch (e) {
      return true;
    }
  }
}
