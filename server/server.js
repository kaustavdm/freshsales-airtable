'use strict'

/* global $db, $request, renderData */

var transform = require('./transform')
var state = require('./state')
var schedule = require('./schedule')
var leadClient = require('./lead')
var airtableClient = require('./airtable')
var { dateStamp, handleError } = require('./helper')

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
    schedule.create(payload)
      .then(function () {
        console.log('App installed')
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
    console.log('Scheduled event triggered', payload)
    var startTime = Date.now()
    var l = leadClient.domain(payload.domain)

    state.start()
      .then(function () {
        return airtableClient.records(dateStamp(-90000))
      })
      .then(function (records) {
        for (var r of records) {
          // New lead records
          if (!r.fields.ID && !state.exists(r.id)) {
            promise = l.create(transform('airtable', 'freshsales', r.fields))
              .then(function (lead) {
                return state.queue(r.id, lead.id, Date.now())
              })
          }

          // Lead records marked for deletion
          else if (r.fields.Delete && r.fields.ID) {
            promise = l.delete(r.fields.ID)
              .then(function () {
                return airtableClient.delete(r.id)
              })
              .then(function () {
                return state.dequeue(r.id).leadDeleted(r.fields.ID)
              })
          }

          // Updated lead records
          else if (r.fields.ID && !r.fields.Delete && !state.exists(r.id)) {
            promise = l.update(transform('airtable', 'freshsales', r.fields))
              .then(function (lead) {
                return state.queue(r.id, lead.id, Date.now())
              })
          }

          promise.then && promise.then(function () {
            console.log('Processed row', r.recordId)
          })
          .fail(handleError)
        }
        state.sync(startTime)
          .then(function () {
            console.log('State synced successfully')
          })
          .fail(handleError)
      })
      .fail(handleError)
  },

  /**
   * Handler for lead create event
   *
   * @param {Object} args - Args from the lead create event
   */
  onLeadCreate: function onLeadCreateHandler (args) {
    var startTime = Date.now()
    state.start()
    .then(function () {
      return airtableClient.create(args.data.lead)
    })
      .then(function (res) {
        var now = Date.now()
        return state.queue(res.id, args.data.lead.id, now).sync(startTime)
      })
      .fail(handleError)
  },

  /**
   * Handler for lead update event
   */
  onLeadUpdate: function onLeadUpdateHandler (args) {
    var startTime = Date.now()
    state.start()
      .then(function () {
        return state.leadStatus(args.data.lead.id)
      })
      .then(function (res) {
        return airtableClient.update(res.airtableRecordId, args.data.lead)
      })
      .then(function (res) {
        var now = Date.now()
        return state.queue(res.id, args.data.lead.id, now).sync(startTime)
      })
      .fail(handleError)
  },

  /**
   * Handler for lead delete event
   */
  onLeadDelete: function onLeadDeleteHandler (args) {
    state.leadStatus(args.data.lead.id)
      .then(function (res) {
        return airtableClient.delete(res.airtableRecordId)
      })
      .then(function () {
        return state.leadDeleted(args.data.lead.id)
      })
      .fail(handleError)
  }

}
