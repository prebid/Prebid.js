const express = require('express')
const path = require('path');
const port = process.env.PORT || 6000
const server = express()

// server.use('/build', express.static('build'))

server.use(express.static(path.resolve(__dirname, 'dist')))

server.get('/test', function(req, res) {
  console.log('PONG');
  res.send('pong');
});

server.listen(port, (err, updatedServer) => {
  if (err) console.error(err)
  console.info(`⚡⚡⚡ Server running on port - ${port}`)
})
