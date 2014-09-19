Model = require '../utils/model'

module.exports = new Model

    "data":
        # Firebase app name.
        "firebase": "burnchart"
        # Data source provider.
        "provider": "github"
        # Fields to keep from GH responses.
        "fields":
            "milestone": [
                "closed_issues"
                "created_at"
                "description"
                "due_on"
                "number"
                "open_issues"
                "title"
                "updated_at"
            ]
        # Chart configuration.
        "chart":
            "off_days": [ 6, 7 ]
            # How do we parse GitHub dates?
            "datetime": /^(\d{4}-\d{2}-\d{2})T(.*)/
            # How does a size label look like?
            "size_label": /^size (\d+)$/
            # How do we specify which user/repo/(milestone) we want?
            "location": /^#!((\/[^\/]+){2,3})$/
            # Process all issues as one size.
            "points": 'ALL_ONE_SIZE'