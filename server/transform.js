var transforms = [
  {
    from: 'airtable',
    to: 'freshsales',
    fn: function (values) {
      return {
        id: values.ID,
        first_name: values['First Name'],
        last_name: values['Last Name'],
        email: values.Email,
        company: {
          name: values.Company
        },
        linkedin: values.LinkedIn,
        created_at: values['Created At']
      }
    }
  },
  {
    from: 'freshsales',
    to: 'airtable',
    fn: function (values) {
      return {
        ID: values.id,
        'First Name': values.first_name,
        'Last Name': values.last_name,
        Company: values.company.name,
        Email: values.email,
        LinkedIn: values.linkedin,
        'Created At': values.created_at
      }
    }
  },
  {
    from: 'airtable',
    to: 'airtable',
    fn: function (values) {
      var schema = {
        ID: '',
        'First Name': '',
        'Last Name': '',
        Company: '',
        Email: '',
        LinkedIn: '',
        'Created At': ''
      }
      return Object.assign({}, schema, values)
    }
  },
  {
    from: 'freshsales',
    to: 'freshsales',
    fn: function (values) {
      var schema = {
        id: '',
        first_name: '',
        last_name: '',
        company: { name: '' },
        email: '',
        linkedin: '',
        created_at: ''
      }
      var rec = Object.assign({}, schema, values)
      rec.company = Object.assign({}, schema.company, values.company)
      return rec
    }
  }
]

exports = function transform (from, to, values) {
  var t = transforms.filter(function (elem) {
    return elem.from === from && elem.to === to
  })
  if (t[0] && typeof t[0].fn === 'function') {
    return t[0].fn.apply({}, [values])
  } else {
    throw new Error('Transformer not found for ' + from + ' to ' + to)
  }
}
