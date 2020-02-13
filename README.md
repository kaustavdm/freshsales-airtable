## Freshsales <> Airtable sync

Status: Work in Progress.

A Freshsales custom app to sync an Airtable sheet with Freshsales leads.

The Airtable sheet should contain these columns:

 - `ID` - Numeric. Primary field.
 - `First Name` - Text
 - `Last Name` - Text
 - `Email` - Email address
 - `LinkedIn` - URL
 - `City` - Text
 - `Company` - Text
 - `Created At` - Create date/time
 - `Updated At` - Last updated date/time

### Project folder structure explained

    .
    ├── README.md                  This file.
    ├── config                     Installation parameter configs.
    │   ├── iparams.json           Installation parameter config in English language.
    └── manifest.json              Project manifest.
    └── server                     Business logic for remote request and event handlers.
        ├── server.js
