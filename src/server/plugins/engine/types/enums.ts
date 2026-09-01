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

// Changed from an enum to enforce numeric values
export const FormAdapterSubmissionSchemaVersion = {
  V1: 1
} as const satisfies Record<string, number>
