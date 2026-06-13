export const MATERIAL_ACCEPTANCE_EMAIL_QUEUE = 'material-acceptance-email';

export const MATERIAL_ACCEPTANCE_EMAIL_JOB = 'send-email';

export const MATERIAL_ACCEPTANCE_EXPORT_QUEUE = 'material-acceptance-export';

export const MATERIAL_ACCEPTANCE_EXPORT_JOB = 'send-export';

export const MATERIAL_NOTIFICATION_EMAIL_QUEUE = 'material-notification-email';

export const MATERIAL_NOTIFICATION_EMAIL_JOB = 'send-email';

export const MATERIAL_ACCEPTANCE_EMAIL_QUEUE_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
  removeOnComplete: true,
  removeOnFail: false,
};

export const MATERIAL_ACCEPTANCE_EXPORT_QUEUE_OPTIONS =
  MATERIAL_ACCEPTANCE_EMAIL_QUEUE_OPTIONS;

export const MATERIAL_NOTIFICATION_EMAIL_QUEUE_OPTIONS =
  MATERIAL_ACCEPTANCE_EMAIL_QUEUE_OPTIONS;

export const REPORT_EXPORT_QUEUE = 'report-export';

export const REPORT_EXPORT_JOB = 'send-export';

export const REPORT_EXPORT_QUEUE_OPTIONS = MATERIAL_ACCEPTANCE_EMAIL_QUEUE_OPTIONS;
