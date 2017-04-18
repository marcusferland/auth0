const cluster = require('cluster')

if (cluster.isMaster) {

  const numCPUs = require('os').cpus().length
  console.log(`Master cluster setting up ${numCPUs} workers...`)

  for (var i = 0; i < numCPUs; i++) cluster.fork()

  cluster.on('online', worker => {
    console.log(`Worker ${worker.process.pid} is online`)
  })

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`)
    console.log('Starting a new worker')
    cluster.fork()
  })
}
else {
  const app = require('express')()
  const bodyParser = require('body-parser')
  const oauthserver = require('oauth2-server')
  const mongoose = require('mongoose')
  const cors = require('cors')
  const model = require('./model')
  const config = require('./config')

  mongoose.connect(config.mongoUrl, (err, res) => {
    if (err) console.log(`ERROR connecting to: ${config.mongoUrl}; ${err}`)
  })

  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())
  app.use(cors())

  app.oauth = oauthserver({
    model: model,
    grants: ['auth_code', 'password', 'refresh_token'],
    debug: true,
    accessTokenLifetime: model.accessTokenLifetime
  })

  // Handle token grant requests
  app.all('/oauth/token', app.oauth.grant())

  app.get('/secret', app.oauth.authorise(), (req, res) => {
    // Will require a valid access_token
    res.send('Secret area')
  })

  app.get('/public', (req, res) => {
    // Does not require an access_token
    res.send('Public area')
  })

  // Error handling
  app.use(app.oauth.errorHandler())

  app.listen(config.serverPort, () => console.log(`App running at http://localhost:${config.serverPort}`))
}
