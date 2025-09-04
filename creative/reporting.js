export function registerReportingObserver(callback, types) {
  if ('ReportingObserver' in window) {
    const observer = new ReportingObserver((reports) => {
      callback(reports[0]);
    }, { buffered: true, types });
    observer.observe();
  }
}
