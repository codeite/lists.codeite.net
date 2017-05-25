const express = require('express')
const bodyParser = require('body-parser')

const config = require('./config')
const couchdb = require('./couchdb')

const app = express()
app.set('trust proxy', true)
app.use(bodyParser.json())
app.use(require('./codeite-auth')('lists', config.secrets.lists))

app.use((req, res, next) => {
  const origin = req.get('Origin')
  if (origin && origin.endsWith('.aq')) {
    res.set('Access-Control-Allow-Origin', origin)
    res.set('Access-Control-Allow-Credentials', 'true')
  }

  req.urlHost = req.protocol + '://' + req.get('host')
  next()
})

app.get('/list/:userId', (req, res) => {

})

function buildId(req) {
  return `${req.userId}%2F${req.params.appId}%2F${req.listId||'index'}`
}

function buildEmptyDoc(req) {
  return {
    "owner": req.userId,
    "app": req.params.appId,
    "list": req.listId||'',
    "meta": {},
    "items": {}
  }
}

app.param('userId', (req, res, next, id) => {
  req.userId = (id === '~') ? req.userId : id
  next()
});

app.get('/', (req, res) => {
  res.send({
    users: req.urlHost + '/users',
    currentUser: req.userId
  })
})

app.get('/users', (req, res) => {
  couchdb.getView('views', 'users', {reduce: true, group: true})
    .then(results => {
      res.send({
        //results,
        users: results.rows.map(r => req.urlHost + '/apps/' +r.key)
      })
    })
    .catch(err => {
      console.log('err:', err)
      res.status(500).send(err)
    })
})

app.get('/apps/:userId', (req, res) => {
  couchdb.getView('views', 'apps', {reduce: true, group: true, startkey: req.params.userId})
    .then(results => {
      res.send({
        //results,
        users: results.rows.map(r => `${req.urlHost}/lists/${r.key}`)
      })
    })
    .catch(err => {
      console.log('err:', err)
      res.status(500).send(err)
    })
})

app.get('/lists/:userId/:appId', (req, res) => {
  couchdb.getView('views', 'lists', {reduce: true, group: true, startkey: req.params.userId + '/' + req.params.appId})
    .then(results => {
      res.send({
        //results,
        lists: results.rows.map(r => `${req.urlHost}/list/${r.key}`)
      })
    })
    .catch(err => {
      console.log('err:', err)
      res.status(500).send(err)
    })
})

app.get('/list/:userId/:appId/:listId?', (req, res) => {
  const id = buildId(req)
  console.log('req.headers:', req.headers)

  couchdb.getDocumentById(id)
    .then(document => {
      if (req.accepts('application/json')) {
        res.send(document.items)
      } else if (req.accepts('application/full+json')) {
        res.set('Content-Type', 'application/full+json');
        res.send(document)
      } else {
        res.send(document.items)
      }

    })
    .catch(err => {
      console.log('err:', err)
      res.status(500).send(err)
    })
})

app.put('/list/:userId/:appId/:listId?', (req, res) => {
  const id = buildId(req)
  const document = buildEmptyDoc(req)
  const {rev} = req.query

  couchdb.getDocumentById(id)
    .then(document => {
      if (rev && rev !== document._rev) {
        return res.status(406).send('Wrong rev!')
      }

      document.items = req.body
      return couchdb.save(id, document)
    })
    .then(doc => {
      res.send(doc)
    })
    .catch(err => {
      console.log('err:', err)
      res.status(500).send(err)
    })
})

app.patch('/list/:userId/:appId/:listId?', (req, res) => {
  const id = buildId(req)
  const {rev} = req.query

  couchdb.getDocumentById(id)
    .then(document => {
      if (rev && rev !== document._rev) {
        return res.status(406).send('Wrong rev!')
      }

      Object.assign(document.items, req.body)
      return couchdb.save(id, document)
    })
    .then(doc => {
      res.send(doc)
    })
    .catch(err => {
      console.log('err:', err)
      res.status(500).send(err)
    })
})

app.listen(config.port, err => {
  if (err) {
    console.log('err:', err)
  } else {
    console.log(`App started. Listening on port ${config.port}`)
  }
})