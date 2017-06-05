const fs = require('fs')
const path = require('path')
const couch = require('./couchdbAdmin')
const config = require('./config')

const pause = t => new Promise(resolve => { setTimeout(() => resolve(), t) })

const fsp = {
  readdir: dir => new Promise((resolve, reject) => {
    fs.readdir(dir, (err, items) => (err ? reject(err) : resolve(items)))
  }),
  readFile: (...args) => new Promise((resolve, reject) => {
    fs.readFile(...args, (err, content) => (err ? reject(err) : resolve(content)))
  })
}

const out = function (res) {
  return {
    write (x) { res.write(`<div>${x}</div>\n`) },
    writeRaw (x) { res.write(`${x}\n`) },
    end (x) { res.end(`<div>${x}</div>\n`) }
  }
}

module.exports = function (req, res) {
  if (req.protocol !== 'https') {
    return res.status(400).send('Can only use setup over https')
  }

  const [, password] = Buffer.from((req.get('Authorization') || '').substr('Basic '.length), 'base64').toString().split(':')
  if (password !== config.setupPassword) {
    res.set('WWW-Authenticate', 'Basic realm="Setup"')
    return res.status(401).send('Not authorised to run setup')
  }

  const trialRun = (req.method !== 'POST')

  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Transfer-Encoding': 'chunked'
  })
  res = out(res)
  res.write([...Array(1000)].join(' '))
  res.writeRaw('<h1>Setup</h1>')
  if (trialRun) res.writeRaw('<h2>Trial Run</h2>')

  testDbExists(res, trialRun)
    .then(exists => {
      if (exists) {
        return checkDesignDocuments(res, trialRun)
          .then(() => res.write('Pause 1000'))
          .then(() => pause(1000))
      }
    })
    .then(() => res.write('<form method="POST"><input type="submit" value="Run for real" /></form>'))
    .then(() => res.end('<span id="done">Done</span>'))
    .catch(err => {
      console.log(err)
      res.end(err + '')
    })
}

function testDbExists (res, trialRun) {
  res.write('Checking database...')
  return couch.dbExists()
    .then(db => {
      if (db) {
        res.write(`Database '${db.db_name}' exists.`)
        return true
      } else {
        res.write(`Database does not exist.`)
        if (trialRun) {
          return false
        } else {
          return createDb(res)
        }
      }
    })
}

function createDb (res) {
  res.write('Creating...')
  return couch.dbCreate()
    .then(name => {
      res.write(`Database created.`)
      return true
    })
}

function checkDesignDocuments (res, trialRun) {
  return fsp.readdir(path.join(__dirname, 'designDocuments'))
    .then(items =>
      Promise.all(items.filter(n => n.endsWith('.json')).map(item => fsp.readFile(path.join(__dirname, 'designDocuments', item), 'utf8').then(content => ({
        name: item.slice(0, -5),
        content: JSON.parse(content)
      }))))
    )
    .then(documents => {
      return sequence(documents.map(document => () => checkDesignDocument(document, res, trialRun)))
    })
}

function sequence (arrPromises) {
  return new Promise((resolve, reject) => {
    const loop = () => {
      if (arrPromises.length === 0) {
        return resolve()
      } else {
        arrPromises[0]().then(() => {
          arrPromises.shift()
          loop()
        }).catch(err => reject(err))
      }
    }
    loop()
  })
}

function checkDesignDocument (document, res, trialRun) {
  const dbId = `_design/${document.name}`
  res.writeRaw(`<fieldset><legend>${dbId}</legend>`)
  res.write(`Reading "${dbId}" ...`)
  return couch.getDocumentById(dbId)
    .then(existingDocument => {
      let prom = Promise.resolve()

      if (existingDocument) {
        res.write(`"${dbId}" exists.`)

        const existingClean = Object.assign({}, existingDocument)
        delete existingClean._id
        delete existingClean._rev

        const expectedContent = document.content
        delete expectedContent._id
        delete expectedContent._rev

        const exi = JSON.stringify(existingClean)
        const exp = JSON.stringify(expectedContent)

        res.writeRaw(`<table><tr><td>Existing:</td><td><pre style="white-space:nowrap;">${exi}</pre></td></tr>`)
        res.writeRaw(`<tr><td>Expecting:</td><td><pre style="white-space:nowrap;">${exp}</pre></td></tr></table>`)

        if (exi !== exp) {
          if (trialRun) {
            res.write(`"${dbId}" content is wrong, should do update.`)
          } else {
            res.write(`"${dbId}" content is wrong, updating.`)

            const newDocument = {name: document.name, content: Object.assign({}, expectedContent, {_rev: existingDocument._rev})}
            console.log('newDocument:', newDocument)
            prom = createDesignDocument(newDocument, res)
          }
        }
      } else {
        if (trialRun) {
          res.write(`"${dbId}" does not exist, should create`)
        } else {
          res.write(`"${dbId}" does not exist.`)
          prom = createDesignDocument(document, res)
        }
      }

      res.writeRaw('</fieldset>')
      return prom
    })
}

function createDesignDocument (document, res) {
  const dbId = `_design/${document.name}`
  if (document.content._rev) {
    res.write(`Updating "${dbId}" ...`)
  } else {
    res.write(`Creating "${dbId}" ...`)
  }

  return couch.save(dbId, document.content)
    .then(() => {
      res.write(`"${dbId}" created.`)
    })
}


