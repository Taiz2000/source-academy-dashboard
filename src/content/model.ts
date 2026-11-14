import type { RawSubmission, RawUser } from './types';

/** Mirrors ProgressStatuses in the SA frontend (AssessmentTypes.ts). */
export type Progress =
  | 'autograded'
  | 'not_attempted'
  | 'attempting'
  | 'attempted'
  | 'submitted'
  | 'graded'
  | 'published';

export const PROGRESS_ORDER: Progress[] = [
  'submitted',
  'graded',
  'published',
  'attempted',
  'attempting',
  'not_attempted',
  'autograded',
];

export const PROGRESS_LABEL: Record<Progress, string> = {
  submitted: 'Needs grading',
  graded: 'Graded, unpublished',
  published: 'Published',
  attempted: 'Attempted',
  attempting: 'Attempting',
  not_attempted: 'Not attempted',
  autograded: 'Autograded',
};

/** Short labels for heatmap cells, matching the text of SA's ProgressStatusBadge. */
export const PROGRESS_CELL_LABEL: Record<Progress, string> = {
  submitted: 'Submitted',
  graded: 'Graded',
  published: 'Published',
  attempted: 'Attempted',
  attempting: 'Attempting',
  not_attempted: 'Not Attempted',
  autograded: 'Autograded',
};

export type Member = {
  /** Course registration id. */
  id: number;
  name: string;
  username: string;
  /** "-" when the student has no group. */
  groupName: string;
  /** Course registration id of the student's group leader (tutor); null without a group. */
  groupLeaderId: number | null;
};

export type Submission = {
  id: number;
  assessmentId: number;
  assessmentNumber: string;
  assessmentTitle: string;
  assessmentType: string;
  studentName: string;
  studentUsername: string;
  groupName: string;
  /** The student, or every member of the team. */
  members: Member[];
  progress: Progress;
  gradedCount: number;
  questionCount: number;
  xp: number;
  maxXp: number;
  xpBonus: number;
};

/** Same rules as backendParamsToProgressStatus in the SA frontend (GradingUtils.ts). */
export function toProgress(s: RawSubmission): Progress {
  if (!s.assessment.isManuallyGraded) return 'autograded';
  if (s.status !== 'submitted') return s.status;
  if (s.gradedCount < s.assessment.questionCount) return 'submitted';
  if (!s.isGradingPublished) return 'graded';
  return 'published';
}

export function normalize(s: RawSubmission): Submission {
  const users: RawUser[] = s.student
    ? [s.student]
    : (s.team?.team_members.filter((m): m is RawUser => m !== null) ?? []);
  const members: Member[] = users.map(u => ({
    id: u.id,
    name: u.name,
    username: u.username,
    groupName: u.groupName ?? '-',
    groupLeaderId: u.groupLeaderId ?? null,
  }));
  return {
    id: s.id,
    assessmentId: s.assessment.id,
    assessmentNumber: s.assessment.assessmentNumber,
    assessmentTitle: s.assessment.title,
    assessmentType: s.assessment.type,
    studentName: members.map(m => m.name).join(', '),
    studentUsername: members.map(m => m.username).join(', '),
    groupName: members[0]?.groupName ?? '-',
    members,
    progress: toProgress(s),
    gradedCount: s.gradedCount ?? 0,
    questionCount: s.assessment.questionCount,
    xp: (s.xp ?? 0) + (s.xpAdjustment ?? 0),
    maxXp: s.assessment.maxXp,
    xpBonus: s.xpBonus ?? 0,
  };
}

/**
 * SA's "Viewing unpublished submissions": submitted, manually graded and not yet published
 * (unpublishedToBackendParams in the frontend's GradingUtils.ts), i.e. Submitted or Graded.
 */
export const isUnpublished = (s: Submission) => s.progress === 'submitted' || s.progress === 'graded';

export type ProgressCounts = Record<Progress, number>;

export const emptyCounts = (): ProgressCounts => ({
  autograded: 0,
  not_attempted: 0,
  attempting: 0,
  attempted: 0,
  submitted: 0,
  graded: 0,
  published: 0,
});

export function countByProgress(rows: Submission[]): ProgressCounts {
  const counts = emptyCounts();
  for (const r of rows) counts[r.progress]++;
  return counts;
}

export const uniqueSorted = (values: string[]) =>
  [...new Set(values)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
