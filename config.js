require('dotenv').config()
const conf = require('sp-conf')

const endsWithSlash = /\/$/

const myconfig = {
  port: conf.readNumber('PORT', {defaultValue: 12006}),
  database: {
    url: conf.readUrl('DB_URL', {validator: endsWithSlash}),
    user: conf.readString('DB_USER'),
    pass: conf.readPassword('DB_PASS')
  }
}

if (conf.missingEnvVars) {
  console.error('Some required env vars were missing. Terminating')
  process.exit(1)
}

conf.makeClonableAndDeepFreeze(myconfig)

module.exports = myconfig