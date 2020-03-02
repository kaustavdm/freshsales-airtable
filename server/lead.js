'use strict'

/* global $request */

function parseRes (data) {
  var res
  try {
    res = JSON.parse(data.response)
  } catch (err) {
    console.error('Error parsing JSON', err.message)
    throw err
  }
  return res
}

function handleError (err) {
  console.error('Error: ' + (err.message || err.status))
  console.error('Error details', err)
}

module.exports = {
  baseUrl: '',

  domain (d) {
    this.baseUrl = 'https://' + d
    return this
  },

  create (lead) {
    var opts = {
      headers: {
        Authorization: 'Token token=<%= iparam.api_key %>',
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({ lead: lead })
    }
    var url = this.baseUrl + '/api/leads'

    return $request.post(url, opts)
      .then(parseRes)
      .fail(handleError)
  },

  update () {
    return this
  },

  delete (leadId) {
    return this
  }
}
