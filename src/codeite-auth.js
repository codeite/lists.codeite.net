const crypto = require('crypto')
const moment = require('moment')

const rejector = res => reason => {
  res.status(401).send({
    status: 401,
    reason
  })
}

module.exports = (name, secret) => (req, res, next) => {
  const cookieHeader = req.headers.cookie
  const reject = rejector(res)

  req.userId = 'sam'
  return next()

  if (!cookieHeader) {
    return reject('no_cookies')
  }

  const cookies = cookieHeader
    .split('; ')
    .map(str => {
      const [key, val] = str.split('=')
      return {key, val: decodeURIComponent(val)}
    })

  const cookie = cookies.find(x => x.key === name)
  if (!cookie) {
    return reject('no_list_cookie')
  }

  const cookieValue = cookie.val
  if (!cookieValue) {
    return reject('no_list_cookie_value')
  }

  const [version, userId, created, sig] = cookieValue.split('|')

    if (version !== 'v1') {
      return reject('invalid_version')
    }

    const validFrom = moment().add(-30, 'days')
    const validTo = moment()
    if (!moment(created).isBetween(validFrom, validTo)) {
      return reject('expired_token')
    }

    const token = `v1|${userId}|${created}`

    const hash = crypto
      .createHmac('sha256', secret)
      .update(token)
      .digest('base64')

    if (hash !== sig) {
      return reject(`invalid_signature ${hash} !== ${sig}`)
    }

    req.userId = userId
    return next()
}