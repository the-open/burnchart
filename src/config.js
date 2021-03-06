export default {
  // Firebase.
  "firebase": {
    apiKey: "AIzaSyBfFsB9Pi29A6FG3jEnTznC0gbbgwwlH3I",
    authDomain: "open-burnchart.firebaseapp.com"
  },
  // Data source provider.
  "provider": "github",
  // Fields to keep from GH responses.
  "fields": {
    "milestone": [
      "closed_issues",
      "created_at",
      "description",
      "due_on",
      "number",
      "open_issues",
      "title",
      "updated_at"
    ]
  },
  // Chart configuration.
  "chart": {
    // Days we are not working. Mon = 1
    "off_days": [6,7],
    // How does a size label look like?
    "size_label": /^size (\d+)$/,
    // Process all issues as one size (ONE_SIZE) or use labels (LABELS).
    "points": 'LABELS'
  },
  // Request pertaining.
  "request": {
    // Default timeout of 10s.
    "timeout": 1e4
  },
  // The app theme; 'monza' is the default red theme.
  "theme": "monza"
};
