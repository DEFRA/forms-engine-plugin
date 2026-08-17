export enum UploadStatus {
  initiated = 'initiated',
  pending = 'pending',
  ready = 'ready'
}

export enum FileStatus {
  complete = 'complete',
  rejected = 'rejected',
  pending = 'pending'
}

export enum FormAdapterSubmissionSchemaVersion {
  V1 = 1,

  /**
   * Adds `notificationTargets` - the resolved list of addresses the submission
   * should be sent to, with any output conditions already evaluated.
   */
  V2 = 2
}
