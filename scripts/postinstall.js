#!/usr/bin/env node
var path = require('path')
var exec = require('child_process').exec
var cwd = process.cwd()
// Check if install is local or in node_modules as dependancy b/c postinstall runs everytime anything is installed
if (cwd.indexOf('node_modules') === -1) { // You might need to tweak this check
  console.log('in local dev context. Build DLL')
  var webpackPath = path.join(cwd, 'node_modules', '.bin', 'webpack')
  exec(`${webpackPath} --display-chunks --color --config webpack.dll.config.js`, {cwd: cwd}, function (error, stdout, stderr) {
    if (error) {
      console.warn(error)
    }
    console.log(stdout)
    console.log('Built dll for local DEV')
  })
} else {
  console.log('in node_modules context, stop DLL build on postinstall')
}