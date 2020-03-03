/* global $db */

var { handleError } = require('./helper')
var syncState = []

module.exports = {
  leadState (leadId) {
    return $db.get('freshsales:lead:' + leadId)
      .fail(handleError)
  },

  /**
   *
   * @param {String} leadId
   * @param {String} airtableRecordId
   * @param {Number} updatedAt - Unix timestamp
   */
  queue (leadId, airtableRecordId, updatedAt) {
    updatedAt = updatedAt || Date.now()
    syncState.push({
      airtableRecordId,
      leadId,
      updatedAt
    })
    return this
  },

  /**
   * Perform the sync
   *
   * @param {Number} startTime - A Unix timestamp. Default to timestamp at the time of function call
   */
  async sync (startTime) {
    var log = await $db.get('log')
    // Merge back log with temporary sync queue
    var merged = log.filter(function (item) {
      return item.updatedAt && item.updatedAt > startTime
    }).assign(log, syncState)

    return $db.set('log', log)
      .then(function () {
        syncState = merged
      })
  },

  recordState (airtableRecordId) {
    return $db.get('airtable:record:' + airtableRecordId)
      .fail(handleError)
  },

  recordDeleted (recordId) {
    return $db.delete('airtable:record:' + recordId)
      .fail(handleError)
  },

  leadChanged (leadId, airtableRecordId, lastUpdated, failedToSync) {
    return $db.set('freshsales:lead:' + leadId, {
      airtableRecordId,
      lastUpdated,
      failedToSync
    })
      .then(function () {
        if (airtableRecordId) {
          return $db.set('airtable:record:' + airtableRecordId, {
            leadId
          })
            .fail(handleError)
        }
      })
  },

  leadDeleted (leadId) {
    return this.leadState(leadId)
      .then(function (rec) {
        var stage = $db.delete('airtable:record:' + rec.airtableRecordId)
        if (rec.airtableRecordId != null) {
          return stage.then(function () {
            return $db.delete('freshsales:lead:' + leadId)
          })
            .fail(handleError)
        } else {
          return stage.fail(handleError)
        }
      })
  }
}
