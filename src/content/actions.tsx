// Per-submission actions, as on SA's grading page (GradingActions.tsx): which apply to which
// status, the same confirmation and notices, and the same requests. After a request succeeds the
// change is applied to this page's data instead of refetching.
import { saveCourseToCache, updateSubmissions } from './data';
import type { IconName } from './icons';
import type { Progress, Submission } from './model';
import { authedPost, HttpError } from './session';
import type { RawSubmission } from './types';
import { confirm, type ConfirmOptions } from './ui/ConfirmDialog';
import { showSuccess, showWarning } from './ui/toast';

export type SubmissionAction = {
  label: string;
  icon: IconName;
  /** Statuses SA shows the action for. */
  appliesTo: Progress[];
  confirm: ConfirmOptions;
  /** Path under /admin/grading/{submissionId}. */
  endpoint: string;
  success: string;
  /** The submission as the backend leaves it; none when the outcome isn't known yet. */
  update?: (submission: RawSubmission) => RawSubmission;
};

/** In SA's order. */
export const SUBMISSION_ACTIONS: SubmissionAction[] = [
  {
    label: 'Reautograde',
    icon: 'refresh',
    appliesTo: ['submitted', 'graded'],
    confirm: {
      contents: [
        <p key="q">Reautograde this submission?</p>,
        <p key="n">Note: all manual adjustments will be reset to 0.</p>,
      ],
      positiveLabel: 'Reautograde',
      positiveIntent: 'danger',
    },
    endpoint: 'autograde',
    // Queues a job; like SA, the result shows on the next refresh.
    success: 'Autograde job queued successfully.',
  },
  {
    label: 'Unsubmit',
    icon: 'undo',
    appliesTo: ['submitted', 'graded'],
    confirm: {
      contents: 'Are you sure you want to unsubmit?',
      positiveLabel: 'Unsubmit',
      positiveIntent: 'danger',
    },
    endpoint: 'unsubmit',
    success: 'Unsubmit successful',
    // The backend reopens the submission and resets its grading (Assessments.unsubmit_submission).
    update: s => ({
      ...s,
      status: 'attempted',
      xp: 0,
      xpAdjustment: 0,
      xpBonus: 0,
      gradedCount: 0,
      unsubmittedAt: new Date().toISOString(),
    }),
  },
  {
    label: 'Publish',
    icon: 'send-to-graph',
    appliesTo: ['graded'],
    confirm: {
      contents: "Publish this assessment's grading?",
      positiveLabel: 'Publish',
      positiveIntent: 'primary',
    },
    endpoint: 'publish_grades',
    success: 'Publish grading successful',
    update: s => ({ ...s, isGradingPublished: true }),
  },
  {
    label: 'Unpublish',
    icon: 'exclude-row',
    appliesTo: ['published'],
    confirm: {
      contents: "Unpublish this assessment's grading?",
      positiveLabel: 'Unpublish',
      positiveIntent: 'primary',
    },
    endpoint: 'unpublish_grades',
    success: 'Unpublish grading successful',
    update: s => ({ ...s, isGradingPublished: false }),
  },
];

export const actionsFor = (submission: Submission) =>
  SUBMISSION_ACTIONS.filter(action => action.appliesTo.includes(submission.progress));

/** Asks for confirmation, then runs the action and reports the outcome as SA does. */
export async function runAction(courseId: number, action: SubmissionAction, submission: Submission) {
  if (!(await confirm(action.confirm))) return;
  try {
    await authedPost(`courses/${courseId}/admin/grading/${submission.id}/${action.endpoint}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    showWarning(message, e instanceof HttpError ? e.status : undefined);
    return;
  }
  showSuccess(action.success);
  if (action.update) {
    updateSubmissions(courseId, new Set([submission.id]), action.update);
    saveCourseToCache(courseId);
  }
}
