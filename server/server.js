'use strict'

/* global $db, $request, renderData */

var schedule = require('./schedule')
var transform = require('./transform')
var leadClient = require('./lead')

var domain = ''

/**
 * Fetch records from Airtable
 *
 * @param {string} since - The time since when Updated At field will be filtered.
 * Create this by using `Date.prototype.toISOString()`. Default: 5 minutes
 *
 * @todo Handle pagination of API response
 *
 * @returns {Promise<Array<Object>} - Returns a Promise that resolves to an
 * array of objects containing records
 */
function getAirtableRecords (since) {
  since = since || (new Date((new Date()).getTime() - 5 * 60000)).toISOString()
  console.log('Fetching Airtable records since ' + since)
  var qs = [
    'pageSize=100',
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
    .fail(function (err) {
      console.error('Error in fetching records from Airtable\n', err)
    })
}

/**
 * Update Airtable record status by setting ID and Synced status
 *
 * @param {string} recordId - The Airtable record ID
 * @param {string} leadId - Freshsales lead ID
 * @param {boolean} checkSynced - True to mark as synced
 * @param {boolean} checkDelete - True to mark as delete
 *
 * @returns {Promise<Array<Object>} - Returns a Promise that resolves to an
 * array of objects containing records
 */
function updateAirtableRecordStatus (recordId, leadId, checkSynced = true, checkDelete = false) {
  var url = 'https://api.airtable.com/v0/<%= iparam.airtable_base_id %>/<%= iparam.airtable_table %>'
  var opts = {
    headers: {
      Authorization: 'Bearer <%= iparam.airtable_api_key %>',
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      records: [
        {
          id: recordId,
          fields: {
            ID: leadId,
            Synced: checkSynced,
            Delete: checkDelete
          }
        }
      ]
    })
  }
  return $request.patch(url, opts)
    .then(function (data) {
      var res
      try {
        res = JSON.parse(data.response).records
      } catch (err) {
        console.error('Error parsing JSON: ' + err.message)
        res = []
      }
      return res
    })
    .fail(function (err) {
      console.error('Error in updating records in Airtable\n', err)
    })
}

function createAirtableRecord (lead) {
  var url = 'https://api.airtable.com/v0/<%= iparam.airtable_base_id %>/<%= iparam.airtable_table %>'
  var opts = {
    headers: {
      Authorization: 'Bearer <%= iparam.airtable_api_key %>',
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      fields: {
        ID: lead.id,
        'First Name': lead.first_name,
        'Last Name': lead.last_name,
        Email: lead.email,
        Company: lead.company.name,
        City: lead.city,
        LinkedIn: lead.linkedin,
        Synced: true,
        Delete: false
      }
    })
  }
  return $request.post(url, opts)
    .then(function (data) {
      console.log(JSON.parse(data.response))
      var res
      try {
        res = JSON.parse(data.response).records
      } catch (err) {
        console.error('Error parsing JSON: ' + err.message)
        res = []
      }
      return res
    })
    .fail(function (err) {
      console.error('Error in creating record in Airtable\n', err)
    })
}

function updateAirtableRecord (recordId, lead) {
  var url = 'https://api.airtable.com/v0/<%= iparam.airtable_base_id %>/<%= iparam.airtable_table %>/' + recordId
  var opts = {
    headers: {
      Authorization: 'Bearer <%= iparam.airtable_api_key %>',
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      fields: {
        ID: lead.id,
        'First Name': lead.first_name,
        'Last Name': lead.last_name,
        Email: lead.email,
        Company: lead.company.name,
        City: lead.city,
        LinkedIn: lead.linkedin,
        Synced: true,
        Delete: false
      }
    })
  }
  return $request.patch(url, opts)
    .then(function (data) {
      console.log(JSON.parse(data.response))
      var res
      try {
        res = JSON.parse(data.response).records
      } catch (err) {
        console.error('Error parsing JSON: ' + err.message)
        res = []
      }
      return res
    })
    .fail(function (err) {
      console.error('Error in updating record in Airtable\n', err)
    })
}

function deleteAirtableRecord (recordId) {
  var url = 'https://api.airtable.com/v0/<%= iparam.airtable_base_id %>/<%= iparam.airtable_table %>/' + recordId
  var opts = {
    headers: {
      Authorization: 'Bearer <%= iparam.airtable_api_key %>',
      'Content-Type': 'application/json; charset=utf-8'
    }
  }
  return $request.delete(url, opts)
    .then(function (data) {
      var res
      try {
        res = JSON.parse(data.response)
      } catch (err) {
        console.error('Error parsing JSON: ' + err.message)
        res = false
      }
      return res
    })
    .fail(function (err) {
      console.error('Error in updating records in Airtable\n', err)
    })
}

function updateLead (lead) {
  var opts = {
    headers: {
      Authorization: 'Token token=<%= iparam.api_key %>',
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({ lead: lead })
  }

  return $db.get('domain')
    .then(function (data) {
      var domain = data.domain || '/'
      var url = 'https://' + domain + '/api/leads/' + lead.id
      return $request.put(url, opts)
    })
    .then(function (data) {
      var res
      try {
        res = JSON.parse(data.response)
      } catch (err) {
        console.error('Error parsing JSON', err.message)
        throw err
      }
      console.info('Updated lead. ID: ' + res.lead.id)
      return res
    })
    .fail(function (err) {
      console.error('Error in updating lead. Status: ', err.status)
    })
}

function deleteLead (leadId) {
  var opts = {
    headers: {
      Authorization: 'Token token=<%= iparam.api_key %>',
      'Content-Type': 'application/json; charset=utf-8'
    }
  }

  return $db.get('domain')
    .then(function (data) {
      var domain = data.domain || '/'
      var url = 'https://' + domain + '/api/leads/' + leadId
      return $request.delete(url, opts)
    })
    .then(function (data) {
      var res
      try {
        res = JSON.parse(data.response)
      } catch (err) {
        console.error('Error parsing JSON', err.message)
        throw err
      }
      console.info('Deleted lead. ID: ' + leadId)
      return res
    })
    .fail(function (err) {
      console.error('Error in deleting lead. Status: ', err.status)
    })
}

// Export stuff
exports = {

  // Set up event bindings for Freshsales
  events: [
    { event: 'onAppInstall', callback: 'onAppInstall' },
    { event: 'onAppUninstall', callback: 'onAppUninstall' },
    { event: 'onScheduledEvent', callback: 'onScheduledEvent' },
    { event: 'onLeadCreate', callback: 'onLeadCreate' },
    { event: 'onLeadUpdate', callback: 'onLeadUpdate' },
    { event: 'onLeadDelete', callback: 'onLeadDelete' }
  ],

  /**
   * Handler for app install event
   *
   * This handler also generates the target URL for Airtable to send HTTP requests to.
   *
   * @param {Object} payload - Payload received from installation
   */
  onAppInstall: function onAppInstall (payload) {
    domain = payload.domain
    schedule.create(payload)
      .then(function () {
        renderData()
      })
      .fail(function (err) {
        console.error('Error on install\n', err)
        renderData({ message: 'Unable to install' })
      })
  },

  /**
   * Handler for app uninstall event
   *
   * @param {Object} payload
   */
  onAppUninstall: function onAppUninstallHandler () {
    console.info('App uninstall triggered')
    schedule.delete()
      .then(function () {
        console.info('Scheduled sync disabled')
        renderData()
      })
      .fail(function (err) {
        renderData({ message: 'Unable to disable scheduled syncing' })
        console.error('Cannot disable sync\n', err)
      })
  },

  /**
   * Handler for scheduled execution
   *
   * @param {Object} payload - Payload received on schedule trigger
   */
  onScheduledEvent: function onscheduledEventHandler (payload) {
    console.info('Scheduled event triggered')
    getAirtableRecords()
      .then(function (records) {
        records.forEach(function (r, idx) {
          var promise
          // New lead records
          if (!r.fields.ID && !r.fields.Synced) {
            promise = leadClient.create(transform('airtable', 'freshsales', r.fields))
          }

          // Lead records marked for deletion
          if (r.fields.Delete && r.fields.ID) {
            promise = deleteLead(r.fields.ID)
              .then(function () {
                return deleteAirtableRecord(r.id)
              })
          }

          // Updated lead records
          if (r.fields.ID && !r.fields.Delete) {
            promise = leadClient.update(transform('airtable', 'freshsales', r.fields))
          }

          promise.then(function () {
            console.log('Processed row', r.recordId)
          })
        })
      })
  },

  /**
   * Handler for lead create event
   *
   * @param {Object} args - Args from the lead create event
   */
  onLeadCreate: function onLeadCreateHandler (args) {
    createAirtableRecord(args.data.lead)
  },

  /**
   * Handler for lead update event
   */
  onLeadUpdate: function onLeadUpdateHandler (args) {
    console.log('Lead Update trigger: ' + args.data.lead.id)
    $db.get('lead:' + args.data.lead.id)
      .then(function (data) {
        if (data && data.recordId) {
          updateAirtableRecord(data.recordId, args.data.lead)
        }
      })
      .fail(function (err) {
        console.log('Error in lead update', err)
      })
  },

  /**
   * Handler for lead delete event
   */
  onLeadDelete: function onLeadDeleteHandler (args) {
    $db.get('lead:' + args.data.lead.id)
      .then(function (data) {
        return deleteAirtableRecord(data.recordId)
      })
      .then(function () {
        return $db.delete('lead:' + args.data.lead.id)
      })
      .fail(function (err) {
        console.error('Error in lead delete. Reason: ', err)
      })
  }

}
