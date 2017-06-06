module.exports = function cors (req, res, next) {
  const origin = req.get('Origin')
  if (origin && (origin.endsWith('.aq') || origin.endsWith('codeite.net'))) {
    res.set('Access-Control-Allow-Origin', origin)
    res.set('Access-Control-Allow-Credentials', 'true')
    res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, DELETE, PATCH')
    res.set('Access-Control-Allow-Headers', 'content-type')
  }
  next()
}