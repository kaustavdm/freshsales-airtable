/* global $db */

var { handleError } = require('./helper')

module.exports = {
  leadState (leadId) {
    return $db.get('freshsales:lead:' + leadId)
      .fail(handleError)
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
