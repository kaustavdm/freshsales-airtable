/* global $request, $schedule, renderData */

/**
 * Fetch records from Airtable
 *
 * @param {string} apiKey - Airtable API Key
 * @param {string} baseId - ID of the Airtable base
 * @param {string} tableName - Name of the table in the Airtable base
 *
 * @returns {Promise<Array<Object>} - Returns a Promise that resolves to an
 * array of objects containing records
 */
function getAirtableRecords (apiKey, baseId, tableName) {
  var qs = [
    'maxRecords=100',
    'pageSize=100',
    'fields[]=ID',
    'fields[]=' + encodeURIComponent('First Name'),
    'fields[]=' + encodeURIComponent('Last Name'),
    'fields[]=Email',
    'fields[]=City',
    'fields[]=LinkedIn',
    'filterByFormula=' + encodeURIComponent('{ID} = ""'),
    'sort[0][field]=' + encodeURIComponent('Created At'),
    'sort[0][direction]=asc'
  ].join('&')

  var url = 'https://api.airtable.com/v0/' + baseId + '/' + tableName + '?' + qs
  var opts = {
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json; charset=utf-8'
    }
  }

  return $request.get(url, opts)
    .then(function (data) {
      var res = JSON.parse(data.response)
      return res.records
    })
    .fail(function (err) {
      console.log('Error in fetching records from Airtable\n', err)
    })
}

function createLead (lead) {
  var url = 'https://kaustavdm.freshsales.io/api/leads'
  var opts = {
    headers: {
      Authorization: 'Token token=<%= (iparam.api_key) %>',
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({ lead: lead })
  }

  return $request.post(url, opts)
    .then(function (data) {
      return JSON.parse(data.response)
    })
    .fail(function (err) {
      console.log('Error in creating lead\n', err)
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
  onAppInstall: function onAppInstall(payload) {
    console.log('App install payload\n', JSON.stringify(payload, null, 2))

    $schedule.create({
      name: 'airtable_lead_sync',
      data: {},
      schedule_at: new Date((new Date()).getTime() + 30000).toISOString(), // 30 seconds from now
      repeat: {
        time_unit: 'minutes',
        frequency: 5
      }
    })
      .then(function () {
        console.log('Scheduled sync successfully')
        renderData()
      })
      .fail(function (err) {
        renderData({ message: 'Unable to schedule syncing' })
        console.error('Cannot schedule sync\n', err)
      })
  },

  /**
   * Handler for app uninstall event
   *
   * @param {Object} payload
   */
  onAppUninstall: function onAppUninstallHandler(payload) {
    console.log('App uninstall payload\n', JSON.stringify(payload, null, 2))
    $schedule.delete({
      name: 'airtable_lead_sync'
    })
      .then(function () {
        console.log('Scheduled sync disabled')
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
  onScheduledEvent: function onscheduledEventHandler(payload) {
    console.log($request)
    console.log('Scheduled Event\n', payload)
    var p = payload.iparams
    getAirtableRecords(p.airtable_api_key, p.airtable_base_id, p.airtable_table)
      .then(function (records) {
        records.forEach(function (r) {
          createLead({
            first_name: r.fields['First Name'],
            last_name: r.fields['Last Name'],
            company: {
              name: r.fields['Company']
            },
            city: r.fields['City'],
            linkedin: r.fields['LinkedIn'],
            created_at: r.fields['Created At'],
            custom_field: {
              airtable_record_id: r.id
            }
          })
          .then(function (res) {
            console.log('Created lead', res)
          })
          .fail(function (err) {
            console.log('Unable to create lead', err)
          })
        })
      })
  },

  /**
   * Handler for lead create event
   *
   * @param {Object} args - Args from the lead create event
   */
  onLeadCreate: function onLeadCreateHandler(args) {
    console.log('Hello ' + args.data.lead.email)
    console.log('Installation args', args.iparam)
  }

}
