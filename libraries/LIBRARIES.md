## Cross-module libraries

Each directory under this one is packaged into a "library" during the build. 

Modules may share code by simply importing from a common library file; if the module is included in the build, any libraries they import from will also be included.
