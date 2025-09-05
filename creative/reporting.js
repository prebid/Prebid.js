export function registerReportingObserver(callback, types, document) {
  const view = document?.defaultView || window;
  if ('ReportingObserver' in view) {
    try {
      const observer = new view.ReportingObserver((reports) => {
        callback(reports[0]);
      }, { buffered: true, types });
      observer.observe();
    } catch (e) {
    }
  }
}
