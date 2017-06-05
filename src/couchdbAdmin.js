const fetch = require('node-fetch')

const config = require('./config')

function auth (existing = {}) {
  if (!config.databaseAdmin.user) return existing
  existing.headers = Object.assign(existing.headers || {}, {
    Authorization: 'Basic ' + new Buffer(config.databaseAdmin.user + ':' + config.databaseAdmin.pass).toString('base64')
  })
  return existing
}

const couchDbUrl = config.databaseAdmin.url

module.exports = {
  save (id, entity) {
    const itemUri = couchDbUrl + id
    const opts = auth({
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(entity)
    })

    return fetch(itemUri, auth(opts))
    .then(r => {
      if (r.status === 404) return null
      if (!r.ok) throw new Error('Error PUTTIN item to CouchDB: ' + r.status + ' ' + r.statusText + ' : ' + JSON.stringify({itemUri, opts}))

      return r.json()
    })
  },
  getDocumentById (id) {
    const itemUri = couchDbUrl + id
    // console.log('CouchDB get:', itemUri)
    return fetch(itemUri, auth())
      .then(r => {
        if (r.status === 404) return null
        if (!r.ok) throw new Error(`Error GETTING item ${itemUri} from CouchDB: ${r.status} ${r.statusText}`)

        return r.json()
      })
  },
  dbExists () {
    return fetch(couchDbUrl, auth())
      .then(r => {
        if (r.status === 404) return null
        if (!r.ok) throw new Error('Error checking database exists: ' + r.status + ' ' + r.statusText)

        return r.json()
      })
  },

  dbCreate () {
    const fetchOptions = {
      method: 'PUT'
    }

    return fetch(couchDbUrl, auth(fetchOptions))
      .then(r => {
        if (r.status === 404) return null
        if (!r.ok) throw new Error('Error creating database: ' + r.status + ' ' + r.statusText)

        return r.json()
      })
  }
}
