// Loads a spec's webpack bundle as classic <script>s, in order, the way karma's context.html does.
// The generated test files await this at top level, so every describe()/it() the bundle declares is
// registered while Vitest is still collecting the file. An exception thrown while a script evaluates
// fails the file, as a load error does under karma.
export async function loadScripts(urls) {
  for (const url of urls) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let error;
      const onError = (ev) => {
        if (ev.filename && new URL(ev.filename, location.href).pathname === url) error = ev.error ?? new Error(ev.message);
      };
      const done = (err) => {
        window.removeEventListener('error', onError);
        if (err) reject(err); else resolve();
      };
      window.addEventListener('error', onError);
      script.onload = () => done(error);
      script.onerror = () => done(new Error(`failed to load ${url}`));
      script.src = url;
      // karma puts its scripts in the body
      document.body.appendChild(script);
    });
  }
}
