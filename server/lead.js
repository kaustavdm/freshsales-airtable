'use strict'

/* global $request */

var { parseRes, handleError } = require('./helper')

exports = {
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

  update (lead) {
    var opts = {
      headers: {
        Authorization: 'Token token=<%= iparam.api_key %>',
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({ lead: lead })
    }

    var url = this.baseUrl + '/api/leads/' + lead.id
    return $request.put(url, opts)
      .then(parseRes)
      .fail(handleError)
  },

  delete (leadId) {
    var opts = {
      headers: {
        Authorization: 'Token token=<%= iparam.api_key %>',
        'Content-Type': 'application/json; charset=utf-8'
      }
    }

    var url = this.baseUrl + '/api/leads/' + leadId
    return $request.delete(url, opts)
      .then(parseRes)
      .fail(handleError)
  }
}
