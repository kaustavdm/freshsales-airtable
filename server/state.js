/* global $db */

var { handleError } = require('./helper')
var syncQueue = {}

exports = {

  init() {
    return $db.set('log', { queue: {}, lastRun: 0 }).fail(handleError)
  },

  start () {
    return $db.get('log')
      .then(function (res) {
        syncQueue = res.queue
        return { queue: res.queue, lastRun: res.lastRun || 0 }
      })
      .fail(handleError)
  },

  exists (airtableRecordId) {
    return syncQueue[airtableRecordId] && !syncQueue[airtableRecordId].delete
  },

  /**
   * Queue records that have been processed in current run
   *
   * @param {String} airtableRecordId
   * @param {String} leadId
   * @param {Number} updatedAt - Unix timestamp
   */
  queue (airtableRecordId, leadId, updatedAt) {
    updatedAt = updatedAt || Date.now()
    syncQueue[airtableRecordId] = {
      airtableRecordId,
      leadId,
      updatedAt
    }
    return this
  },

  dequeue(airtableRecordId) {
    syncQueue[airtableRecordId] = syncQueue[airtableRecordId] || {}
    syncQueue[airtableRecordId].delete = true
    return this
  },

  /**
   * Perform the sync
   *
   * @param {Number} startTime - A Unix timestamp. Default to timestamp at the time of function call
   */
  sync (startTime) {
    for (var [k, v] of Object.entries(syncQueue)) {
      if (v.delete || v.updatedAt < startTime) {
        delete syncQueue[k]
        return
      }
      this.leadChanged(v.leadId, v.airtableRecordId, v.updatedAt, !!v.failedToSync)
    }
    return $db.set('log', { queue: syncQueue, lastRun: startTime })
  },

  leadStatus (leadId) {
    return $db.get('lead:' + leadId).fail(handleError)
  },

  leadChanged (leadId, airtableRecordId, updatedAt) {
    return $db.set('lead:' + leadId, {
      leadId,
      airtableRecordId,
      updatedAt
    }).fail(handleError)
  },

  leadDeleted (leadId) {
    return $db.delete('lead:' + leadId)
      .fail(handleError)
  }
}
