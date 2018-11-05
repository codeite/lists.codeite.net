const express = require('express')
const bodyParser = require('body-parser')

const config = require('./config')
const couchdb = require('./couchdb')

const app = express()
app.enable('trust proxy')
app.enable('strict routing')
app.use(bodyParser.json())

app.use((req, res, next) => {
  const origin = req.get('Origin')
  if (origin && (origin.endsWith('.aq') || origin.endsWith('codeite.net') || origin.endsWith('codeite.net:3000'))) {
    res.set('Access-Control-Allow-Origin', origin)
    res.set('Access-Control-Allow-Credentials', 'true')
    res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, DELETE, PATCH')
    res.set('Access-Control-Allow-Headers', 'content-type')
  } else {
    if (origin) {
      console.log('Request from origin:', origin)
    }

    res.set('Access-Control-Allow-Origin', 'http://localhost.codeite.net:3000')
    res.set('Access-Control-Allow-Credentials', 'true')
    res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, DELETE, PATCH')
    res.set('Access-Control-Allow-Headers', 'content-type')
  }

  console.log(req.method + ': ' + req.path)

  req.urlHost = req.protocol + '://' + req.get('host')
  next()
})

app.options('*', (req, res, next) => {
  res.send('')
})

app.use(require('./codeite-auth')('lists', config.secrets.lists))

app.all('/setup', require('./setup'))

app.get('/list/:userId', (req, res) => {

})

function buildId(req) {
  return `${req.userId}.${req.params.appId}.${req.listId||'index'}`
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

app.get('/list/:userId/:appId/?:listId?', (req, res) => {
  const id = buildId(req)
  // console.log('req.headers:', req.headers)

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
      if (rev && !document) {
        return res.status(406).send('Document does not exist!')
      }

      if (rev && rev !== document._rev) {
        return res.status(406).send('Wrong rev!')
      }

      if (!document) {
        document = buildEmptyDoc(req)
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

app.get('/list/:userId/:appId/:listId/:listItemId', (req, res) => {
  const id = buildId(req)
  // console.log('req.headers:', req.headers)

  couchdb.getDocumentById(id)
    .then(document => {
      if (req.accepts('application/json')) {
        res.send(document.items[req.params.listItemId])
      } else if (req.accepts('application/full+json')) {
        res.status(409).send()
      } else {
        res.send(document.items[req.params.listItemId])
      }

    })
    .catch(err => {
      console.log('err:', err)
      res.status(500).send(err)
    })
})

app.patch('/list/:userId/:appId/:listId?/:listItemId', (req, res) => {
  const id = buildId(req)

  const update = {}
  console.log('req.body:', req.body)

  Object.keys(req.body).forEach(k => {
    const val = (req.body[k] === null || req.body[k] === undefined) ? '__delete__' : req.body[k]
    update[`/items/${req.params.listItemId}/${k}`] = val
  })
  console.log('update:', update)

  couchdb.update(id, update)
    .then(doc => {
      res.send(doc)
    })
    .catch(err => {
      console.log('err:', err)
      res.status(500).send(err)
    })
})

app.delete('/list/:userId/:appId/:listId?/:listItemId', (req, res) => {
  const id = buildId(req)

  const update = {
    [`/items/${req.params.listItemId}`]: '__delete__'
  }

  couchdb.update(id, update)
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