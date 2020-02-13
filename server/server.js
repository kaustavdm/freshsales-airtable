/* global $db, $request, $schedule, renderData */

function createSchedule (payload, isRecurring) {
  var scheduleName = 'airtable_sync_' + Date.now().toString().substr(-8)
  var opts = {
    name: scheduleName,
    data: payload,
    schedule_at: new Date((new Date()).getTime() + 300000).toISOString() // 5 mins from now
  }
  if (isRecurring) {
    opts.repeat = {
      time_unit: 'minutes',
      frequency: 5
    }
  }
  return $schedule.create(opts)
    .then(function () {
      console.info('Scheduled sync successfully')
      return scheduleName
    })
    .fail(function (err) {
      console.error('Cannot schedule sync\n', err.message)
    })
}

/**
 * Updates last run time in data storage
 *
 * @param {string|null} timeStr - An ISO date string.
 * @param {boolean} isFailure - if `true`, schedules a run in the next 30 seconds
 * @param {Object|null} payload - Optional payload
 */
function updateLastRunTime (timestr, isFailure, payload) {
  timestr = timestr == null ? (new Date()).toISOString() : timestr
  return $db.set('lastrun', {
    timestr: timestr,
    isFailure: isFailure
  })
    .then(function () {
      console.log('Updated last run time to ' + timestr)
    })
    .fail(function () {
      if (isFailure) {
        console.log('Attempting to reschedule soon')
        createSchedule(payload, false)
      }
    })
}

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

function createLead (lead) {
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
      var url = 'https://' + domain + '/api/leads'
      console.log(url)
      return $request.post(url, opts)
    })
    .then(function (data) {
      var res
      try {
        res = JSON.parse(data.response)
      } catch (err) {
        console.error('Error parsing JSON', err.message)
        throw err
      }
      console.info('Created lead. ID: ' + res.lead.id)
      return res
    })
    .fail(function (err) {
      console.error('Error in creating lead. Status: ', err.status)
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
    createSchedule(payload, true)
      .then(function (id) {
        return $db.set('schedule_id', { id: id })
      })
      .then(function () {
        return $db.set('domain', { domain: payload.domain })
      })
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
    $db.get('schedule_id')
      .then(function (res) {
        console.info('Uninstall: Attempting to delete schedule ' + res.id)
        return $schedule.delete({
          name: res.id
        })
      })
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
    var startTime = (new Date()).toISOString()
    $db.get('lastrun')
      .then(function (data) {
        return getAirtableRecords(data.timestr)
      })
      .fail(function () {
        return getAirtableRecords()
      })
      .then(function (records) {
        var recordsLen = records.length
        records.forEach(function (r, idx) {
          var lead = {
            id: r.fields.ID,
            first_name: r.fields['First Name'],
            last_name: r.fields['Last Name'],
            company: {
              name: r.fields.Company
            },
            city: r.fields.City,
            linkedin: r.fields.LinkedIn,
            created_at: r.fields['Created At']
          }

          // New lead records
          if (!r.fields.ID && !r.fields.Synced) {
            createLead(lead)
              .then(function (res) {
                console.info('Updating record in airtable')
                return updateAirtableRecordStatus(r.id, res.lead.id)
                  .then(function () {
                    return $db.set('lead:' + res.lead.id, { recordId: r.id })
                  })
              })
              .fail(function (err) {
                console.info('Lead create error for record: ' + r.id)
                console.error('Unable to create/update lead', err.message)
              })
          }

          // Lead records marked for deletion
          if (r.fields.Delete && r.fields.ID) {
            deleteLead(r.fields.ID)
              .then(function () {
                console.info('Deleting record in Airtable')
                return deleteAirtableRecord(r.id)
              })
              .fail(function (err) {
                console.error('Lead delete error for record: ' + r.id)
                return JSON.parse(err.response)
              })
          }

          // Updated lead records
          if (r.fields.ID && !r.fields.Delete) {
            updateLead(lead)
              .then(function () {
                if (!r.fields.Synced) {
                  return updateAirtableRecordStatus(r.id, r.fields.ID, true, false)
                }
              })
              .fail(function (err) {
                console.log('Unable to update lead', err)
                return updateAirtableRecordStatus(r.id, r.fields.ID, false, false)
              })
          }

          // Last item
          if (idx === recordsLen - 1) {
            // All done successfully
            updateLastRunTime(null, false, payload)
          }
        })
      })
      .fail(function (err) {
        updateLastRunTime(startTime, true, payload)
        console.error('Error running scheduled event\n', payload, err.message)
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
