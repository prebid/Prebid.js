(function (window) {
  if (!window.parent.pbjsKarmaInitDone && window.location.pathname === '/context.html') {
    window.parent.pbjsKarmaInitDone = true;
    window.open('/debug.html', '_blank');
  }
})(window);
