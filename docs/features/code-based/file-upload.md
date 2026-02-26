# File Upload Feature

Our forms platform allows users to upload files as part of their form submissions. This feature is designed to work for both users with JavaScript enabled and those without, ensuring accessibility and reliability.

As our service is written for the Department for Environment, Food & Rural Affairs (Defra), our current file upload feature is coupled to the in-house technology and tools, including the Core Delivery Platform (CDP)'s file upload service (`cdp-uploader`).

## Overview

The file upload system consists of several key components. `FileUploadPageController` manages the upload page, handling user navigation, validation, and error states. `FileUploadField` defines the file input field with validation rules and display options. `cdp-uploader` is an external service that handles file scanning and delivery to S3, while `forms-submission-api` provides backend services for file persistence and lifecycle management.

## How File Upload Works

### User Experience

When JavaScript is enabled, users upload files directly to `cdp-uploader` for virus scanning and delivery through a `<form>` on our frontend posting directly to CDP via Javascript. The browser polls the backend at `/upload-status/{uploadId}` to check when the file is ready, providing immediate feedback in the UI as the upload progresses.

When JavaScript is disabled, the HTML `<form>` is posted on directly to CDP through the form action. Once `cdp-uploader` completes, it redirects the user back to our service. Before a response is returned, our backend takes responsibility for polling `cdp-uploader` to confirm the file has been uploaded and delivered. The user may experience a short wait while the backend validates the upload. `forms-engine-plugin` favours this approach for accessibility reasons. You will need to account for the slow response times (seconds) during this slow action as an exception - most other user actions will be quick (milliseconds).

### Architecture and Data Flow

1. **File Upload Initiation**: The `FileUploadPageController` initiates a new upload session with `cdp-uploader`
2. **File Submission**: User selects and submits a file, which is sent to `cdp-uploader` for scanning
3. **Status Polling**: The system polls `cdp-uploader` to check upload status and validation results
4. **File Staging**: Successfully validated files are stored in S3 under the `staging/` prefix
5. **Form Submission**: When the form is submitted, files are moved to the `loaded/` prefix for long-term storage

### Form Integration Requirements

For file uploads to work correctly, both `FileUploadPageController` and `FileUploadField` must be present in your form definition. The `FileUploadField` must be the first form component in the page definition, and the page must use `"controller": "FileUploadPageController"`.

## Configuration

### Basic File Upload Configuration

```json
{
  "path": "/file-upload-page",
  "title": "Upload your documents",
  "controller": "FileUploadPageController",
  "components": [
    {
      "type": "FileUploadField",
      "name": "documents",
      "title": "Upload your documents",
      "hint": "Select the files you want to upload",
      "options": {
        "required": true,
        "accept": "application/pdf,image/jpeg,image/png"
      },
      "schema": {
        "min": 1,
        "max": 3
      }
    }
  ]
}
```

### FileUploadField Options

| Option     | Type    | Description                                        | Example                        |
| ---------- | ------- | -------------------------------------------------- | ------------------------------ |
| `required` | boolean | Whether file upload is mandatory (default: `true`) | `false`                        |
| `accept`   | string  | Comma-separated list of allowed MIME types         | `"application/pdf,image/jpeg"` |

### FileUploadField Schema Validation

| Property | Type   | Description                                        | Example |
| -------- | ------ | -------------------------------------------------- | ------- |
| `min`    | number | Minimum number of files required                   | `1`     |
| `max`    | number | Maximum number of files allowed                    | `5`     |
| `length` | number | Exact number of files required (overrides min/max) | `3`     |

### Configuration Examples

#### Multiple File Types with Size Limits

```json
{
  "type": "FileUploadField",
  "name": "evidence",
  "title": "Upload supporting evidence",
  "hint": "Upload up to 5 files. Accepted formats: PDF, Word documents, images (JPEG/PNG). Maximum file size: 100MB each.",
  "options": {
    "required": true,
    "accept": "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
  },
  "schema": {
    "min": 1,
    "max": 5
  }
}
```

#### Optional Upload with Exact Count

```json
{
  "type": "FileUploadField",
  "name": "photos",
  "title": "Upload exactly 3 photos",
  "options": {
    "required": false,
    "accept": "image/jpeg,image/png"
  },
  "schema": {
    "length": 3
  }
}
```

#### PDF Only Upload

```json
{
  "type": "FileUploadField",
  "name": "report",
  "title": "Upload your report",
  "options": {
    "required": true,
    "accept": "application/pdf"
  },
  "schema": {
    "min": 1,
    "max": 1
  }
}
```

## File Lifecycle and Management

### File States

Our reference implementation manages files in two primary states.

Staged files are stored in the S3 `staging/` prefix and retained for 7 days through S3 lifecycle policies. These represent temporary storage for files uploaded but not yet submitted with a form. They are created by the `cdp-uploader` service after successful file validation.

Persisted files are stored in the S3 `loaded/` prefix and retained for 90 days through S3 lifecycle policies. These provide long-term storage for files associated with completed form submissions and are created by the `/persist` endpoint when a form is submitted.

If you are using our page controller, you are in charge of setting up these S3 policies yourself.

### File Lifecycle Process

1. **Upload**: User uploads file → `cdp-uploader` scans and validates → `cdp-uploader` delivers the file to S3 with a `staging/` prefix
2. **Form Submission**: User submits form → files moved from `staging/` to `loaded/`
3. **Cleanup**: Unsubmitted files automatically deleted after 7 days, submitted files after 90 days (via S3 policies)

### S3 Lifecycle Management

**Important**: File expiry is managed by S3 lifecycle policies that you must configure in your AWS environment. The plugin, or our `forms-submission-api` service, does not handle file deletion directly.

### Alternative Storage Solutions

Whilst `cdp-uploader` delivers the files to S3, files become owned by your service once they enter S3, so you can do with them what you will, e.g. moving it to Azure, call an API, etc.

When using S3, we recommend lifecycle policies to handle file expiration, although you can implement alternative cleanup mechanisms as our service is agnostic. For example, you could execute a cron job.

To implement custom storage, modify the `/persist` endpoint in your `formSubmissionService` implementation.

## Error Handling and Validation

### File Validation Errors

The system validates files at multiple stages and provides specific error messages:

#### Validation Errors

**Base Validation Errors:**

| Error Type       | Message Template                                      | When It Occurs                                                        |
| ---------------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| `selectRequired` | "Select [field name]"                                 | No files are uploaded when the field is required                      |
| `filesMimes`     | "The selected file must be a [accepted types]"        | File type doesn't match the allowed MIME types in the `accept` option |
| `filesSize`      | "The selected file must be smaller than 100MB"        | File exceeds the maximum size limit (100MB)                           |
| `filesEmpty`     | "The selected file is empty"                          | Uploaded file has zero bytes                                          |
| `filesVirus`     | "The selected file contains a virus"                  | File fails virus scanning by `cdp-uploader`                           |
| `filesPartial`   | "The selected file has not fully uploaded"            | File upload was interrupted or incomplete                             |
| `filesError`     | "The selected file could not be uploaded – try again" | Generic upload error occurred                                         |

**Advanced Settings Validation Errors:**

| Error Type   | Message Template                             | When It Occurs                                                         |
| ------------ | -------------------------------------------- | ---------------------------------------------------------------------- |
| `filesMin`   | "You must upload [number] files or more"     | Number of uploaded files is below the `schema.min` requirement         |
| `filesMax`   | "You can only upload [number] files or less" | Number of uploaded files exceeds the `schema.max` limit                |
| `filesExact` | "You must upload exactly [number] files"     | Number of uploaded files doesn't match the `schema.length` requirement |

### Upload Timeout and Retry Logic

The system includes retry logic for handling upload delays. Initial polling occurs at 2 second intervals, with exponential backoff that increases delays with each retry (2s, 4s, 8s, 16s, then capped at 30s). The maximum timeout is 60 seconds total, with up to 5 retry attempts before timeout. If the timeout is exceeded, a new upload session is initiated.

### Client-side JavaScript Behavior

When JavaScript is enabled, the file upload provides enhanced user experience. Real-time validation gives immediate feedback on file selection, while upload progress shows visual indicators during file processing. Error messages appear inline without page refresh, and the system supports batch uploads within configured limits.

### Accessibility Features

The file upload component follows accessibility best practices. Full keyboard support is provided for file selection and management, with proper labeling and status announcements for screen readers. The component uses progressive enhancement to ensure full functionality without JavaScript, while screen readers are notified of validation errors and clear status indicators are provided for uploaded files.

## Backend Integration: forms-submission-api

This plugin integrates with **forms-submission-api**, an open-source backend service responsible for file persistence and lifecycle management. The API is maintained primarily for the Defra Forms team but is available for anyone to fork and self-host.

**Repository**: [forms-submission-api on GitHub](https://github.com/defra/forms-submission-api)

### Architecture Integration

The plugin communicates with the submission API through the `formSubmissionService` interface:

```javascript
// Default implementation in src/server/plugins/engine/services/formSubmissionService.js
export async function persistFiles(files, persistedRetrievalKey) {
  const payload = { files, persistedRetrievalKey }
  return postJson(`${submissionUrl}/files/persist`, { payload })
}

export async function submit(data) {
  return postJson(`${submissionUrl}/submit`, { payload: data })
}
```

### Key API Endpoints

| Endpoint         | Purpose                                   | Called By               |
| ---------------- | ----------------------------------------- | ----------------------- |
| `/files/persist` | Move files from staging to loaded storage | `SummaryPageController` |
| `/submit`        | Submit form data and file references      | `SummaryPageController` |
| `/file`          | Receive file upload notifications         | `cdp-uploader`          |

### Should You Use forms-submission-api?

Using forms-submission-api offers several advantages. It's ready to deploy as a fully functional backend with minimal setup and is used in production by Defra Forms. The service handles file persistence, validation, and cleanup, and is available as open source software that you can use, modify, and extend.

However, you may want to build a custom backend if you have existing infrastructure with established file storage systems, need specific validation or processing logic, use different storage solutions like Azure Blob Storage or Google Cloud, or must integrate with existing APIs or workflows.

### Custom formSubmissionService Implementation

To implement a custom backend, create a service that matches the expected interface:

```javascript
// Custom implementation example
export const customFormSubmissionService = {
  async persistFiles(files, persistedRetrievalKey) {
    // Your custom file persistence logic
    const results = await yourFileService.moveFiles(files, persistedRetrievalKey)
    return results
  },

  async submit(data) {
    // Your custom form submission logic
    const response = await yourSubmissionService.submitForm(data)
    return response
  }
}

// Inject your custom service
const server = await createServer({
  services: {
    formSubmissionService: customFormSubmissionService
  }
})
```

### Configuration Options

Configure the submission API endpoint in your environment:

```javascript
// config/index.js
submissionUrl: process.env.SUBMISSION_API_URL || 'http://localhost:3001'
```

### Data Flow Summary

The complete data flow follows this pattern: User uploads are sent to `cdp-uploader` which stores them in S3 staging. When the user submits the form, `formSubmissionService.submit()` is called, followed by `formSubmissionService.persistFiles()` which moves files to S3 loaded storage. Finally, email or webhook notifications are sent via the `outputService`.

## File State Reference

| State         | Location (S3 Prefix) | Retention | File created By     | Triggered By          |
| ------------- | -------------------- | --------- | ------------------- | --------------------- |
| **Staged**    | `staging/`           | 7 days    | `cdp-uploader`      | User file upload      |
| **Persisted** | `loaded/`            | 90 days   | `/persist` endpoint | SummaryPageController |
