'use strict'

/* global $request */

var { parseRes, handleError } = require('./helper')

/**
 * HTTP client methods for Airtable API
 */
exports = {

  /**
   * Fetch records from Airtable
   *
   * @param {string} since - The time since when Updated At field will be filtered.
   * Create this by using `Date.prototype.toISOString()`. Default: 90 seconds
   *
   * @returns {Promise<Array<Object>} - Returns a Promise that resolves to an
   * array of objects containing records
   */
  records (since) {
    console.log('Fetching Airtable records since ' + since)
    var qs = [
      'pageSize=50',
      'fields[]=ID',
      'fields[]=' + encodeURIComponent('First Name'),
      'fields[]=' + encodeURIComponent('Last Name'),
      'fields[]=Email',
      'fields[]=City',
      'fields[]=LinkedIn',
      'fields[]=Delete',
      'fields[]=Synced',
      'filterByFormula=' + encodeURIComponent('IS_AFTER({Updated At}, "' + since + '")'),
      'sort[0][field]=' + encodeURIComponent('Updated At'),
      'sort[0][direction]=asc'
    ].join('&')

    var url = 'https://api.airtable.com/v0/<%= iparam.airtable_base_id %>/<%= iparam.airtable_table %>' + '?' + qs
    var opts = {
      headers: {
        Authorization: 'Bearer <%= iparam.airtable_api_key %>',
        'Content-Type': 'application/json; charset=utf-8'
      }
    }

    return $request.get(url, opts)
      .then(function (data) {
        var res = JSON.parse(data.response)
        console.info(res.records.length + ' record(s) fetched from Airtable')
        return res.records
      })
      .fail(function(err) {
        console.error('Could not fetch Airtable records. Check app settings.')
        handleError(err)
      })
  },

  create (lead) {
    var url = 'https://api.airtable.com/v0/<%= iparam.airtable_base_id %>/<%= iparam.airtable_table %>'
    var opts = {
      headers: {
        Authorization: 'Bearer <%= iparam.airtable_api_key %>',
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({ lead })
    }
    return $request.post(url, opts)
      .then(parseRes)
      .fail(function(err) {
        console.error('Could not create Airtable record. Check app settings.')
        handleError(err)
      })
  },

  update (recordId, lead) {
    var url = 'https://api.airtable.com/v0/<%= iparam.airtable_base_id %>/<%= iparam.airtable_table %>/' + recordId
    var opts = {
      headers: {
        Authorization: 'Bearer <%= iparam.airtable_api_key %>',
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({ fields: lead })
    }
    return $request.patch(url, opts)
      .then(parseRes)
      .fail(handleError)
  },

  delete (recordId) {
    var url = 'https://api.airtable.com/v0/<%= iparam.airtable_base_id %>/<%= iparam.airtable_table %>/' + recordId
    var opts = {
      headers: {
        Authorization: 'Bearer <%= iparam.airtable_api_key %>',
        'Content-Type': 'application/json; charset=utf-8'
      }
    }
    return $request.delete(url, opts)
      .then(parseRes)
      .fail(handleError)
  }
}
