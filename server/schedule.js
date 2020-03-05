'use strict'

/* global $schedule */

var { handleError, dateStamp } = require('./helper')
var name = 'freshsales-airtable-sync'

exports = {
  create (payload) {
    var opts = {
      name,
      data: payload,
      schedule_at: dateStamp(60000), // 1 mins from now
      repeat: {
        time_unit: 'minutes',
        frequency: 1
      }
    }
    return $schedule.create(opts).fail(handleError)
  },

  delete () {
    return $schedule.delete({ name }).fail(handleError)
  }
}
