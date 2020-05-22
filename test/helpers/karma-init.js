(function (window) {
  if (!window.parent.pbjsKarmaInitDone && window.originalLocation.pathname === '/context.html') {
    window.parent.pbjsKarmaInitDone = true;
    window.open('/debug.html', '_blank');
  }
})(window);
