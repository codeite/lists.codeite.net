const fetch = require('node-fetch')

const config = require('./config')

function auth (existing = {}) {
  if (!config.database.user) return existing
  existing.headers = Object.assign(existing.headers || {}, {
    Authorization: 'Basic ' + new Buffer(config.database.user + ':' + config.database.pass).toString('base64')
  })
  return existing
}

const couchDbUrl = config.database.url

module.exports = {
  save (id, document) {
    const itemUri = couchDbUrl + id
    const opts = auth({
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(document)
    })

    return fetch(itemUri, opts)
    .then(r => {
      // if (r.status === 404) return null
      if (!r.ok) throw new Error(`Error PUTTING item ${itemUri} to CouchDB: ${r.status} ${r.statusText} : ` + JSON.stringify(opts))

      return r.json()
    })
  },
  update (id, updateDoc) {
    const itemUri = `${couchDbUrl}/_design/updates/_update/partialUpdate/${id}`
    const opts = auth({
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(updateDoc)
    })

    return fetch(itemUri, opts)
    .then(r => {
      // if (r.status === 404) return null
      if (!r.ok) throw new Error(`Error PUTTING item ${itemUri} to CouchDB: ${r.status} ${r.statusText} : ` + JSON.stringify(opts))

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
  getView (designDocument, view, options={}) {
    // _design/views/_view/users?reduce=true&group=true
    // https://codeite.cloudant.com/lists-dev/_design/views/_view/users?limit=10&reduce=true&group=true
    const args = ['reduce', 'group']
      .filter(n => options[n] !== undefined)
      .map(n => `${n}=${options[n]?'true':'false'}`)
      .join('&')
    const viewUri = `${couchDbUrl}_design/${designDocument}/_view/${view}?${args}`
    // console.log('CouchDB get:', itemUri)
    return fetch(viewUri, auth())
      .then(r => {
        // if (r.status === 404) return null
        if (!r.ok) throw new Error(`Error GETTING view ${viewUri} from CouchDB: ${r.status} ${r.statusText}`)

        return r.json()
      })
  }
}
