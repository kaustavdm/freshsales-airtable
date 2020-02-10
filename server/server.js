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
 * @param {string} timeStr - An ISO date string. Optional. Defaults to current time
 * @param {boolean} isFailure - if `true`, schedules a run in the next 30 seconds
 * @param {Object|null} payload - Optional payload
 */
function updateLastRunTime (timestr, isFailure, payload) {
  timestr = timestr || (new Date()).toISOString()
  return $db.set('lastrun', timestr)
    .fail(function (err) {
      if (isFailure) {
        return createSchedule(payload, false)
      }
      console.error('Unable to update last run time in data store', err.message)
      return false
    })
    .fail(function (err) {
      console.error('Error', err.message)
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
 *
 * @returns {Promise<Array<Object>} - Returns a Promise that resolves to an
 * array of objects containing records
 */
function updateAirtableRecordStatus (recordId, leadId) {
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
            Synced: true,
            Delete: false
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
  var url = 'https://kaustavdm.freshsales.io/api/leads'
  var opts = {
    headers: {
      Authorization: 'Token token=<%= iparam.api_key %>',
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({ lead: lead })
  }

  return $request.post(url, opts)
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

function deleteLead (leadId) {
  var url = 'https://kaustavdm.freshsales.io/api/leads/' + leadId
  var opts = {
    headers: {
      Authorization: 'Token token=<%= iparam.api_key %>',
      'Content-Type': 'application/json; charset=utf-8'
    }
  }

  return $request.delete(url, opts)
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
    { event: 'onLeadCreate', callback: 'onLeadCreate' }
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
        console.info('Scheduled: ' + id)
        return $db.set('schedule_id', { id: id })
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
    getAirtableRecords()
      .then(function (records) {
        records.forEach(function (r) {
          var lead = {
            first_name: r.fields['First Name'],
            last_name: r.fields['Last Name'],
            company: {
              name: r.fields.Company
            },
            city: r.fields.City,
            linkedin: r.fields.LinkedIn,
            created_at: r.fields['Created At']
          }

          if (!r.fields.ID && !r.fields.Synced) {
            createLead(lead)
              .then(function (res) {
                console.info('Updating record in airtable')
                return updateAirtableRecordStatus(r.id, res.lead.id)
              })
              .fail(function (err) {
                console.info('Lead create error for record: ' + r.id)
                console.error('Unable to create/update lead', err.message)
              })
          }

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
    console.log('Hello ' + args.data.lead.email)
    console.log('Installation args', args.iparam)
  }

}
