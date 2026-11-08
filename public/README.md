This folder contains overrides for "public" versions of module files. 
Each module has a public version automatically generated (cfr. contents of `dist/public` after `gulp build`),
but if one is found is in this folder it will be used instead.

An override replaces the generated version entirely: for submodules, it should also import the parent module's public version
(see `modules/.submodules.json`), which the generated version would.
