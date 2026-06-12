export const MATERIAL_ACCEPTANCE_EMAIL_QUEUE = 'material-acceptance-email';

export const MATERIAL_ACCEPTANCE_EMAIL_JOB = 'send-email';

export const MATERIAL_ACCEPTANCE_EMAIL_QUEUE_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
  removeOnComplete: true,
  removeOnFail: false,
};
