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

export type Submission = {
  id: number;
  assessmentId: number;
  assessmentNumber: string;
  assessmentTitle: string;
  assessmentType: string;
  studentName: string;
  studentUsername: string;
  groupName: string;
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
  const members: RawUser[] = s.student
    ? [s.student]
    : (s.team?.team_members.filter((m): m is RawUser => m !== null) ?? []);
  return {
    id: s.id,
    assessmentId: s.assessment.id,
    assessmentNumber: s.assessment.assessmentNumber,
    assessmentTitle: s.assessment.title,
    assessmentType: s.assessment.type,
    studentName: members.map(m => m.name).join(', '),
    studentUsername: members.map(m => m.username).join(', '),
    groupName: members[0]?.groupName ?? '-',
    progress: toProgress(s),
    gradedCount: s.gradedCount ?? 0,
    questionCount: s.assessment.questionCount,
    xp: (s.xp ?? 0) + (s.xpAdjustment ?? 0),
    maxXp: s.assessment.maxXp,
    xpBonus: s.xpBonus ?? 0,
  };
}

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

export type AssessmentSummary = {
  id: number;
  number: string;
  title: string;
  type: string;
  total: number;
  counts: ProgressCounts;
};

export function summarizeByAssessment(rows: Submission[]): AssessmentSummary[] {
  const byId = new Map<number, AssessmentSummary>();
  for (const r of rows) {
    let summary = byId.get(r.assessmentId);
    if (!summary) {
      summary = {
        id: r.assessmentId,
        number: r.assessmentNumber,
        title: r.assessmentTitle,
        type: r.assessmentType,
        total: 0,
        counts: emptyCounts(),
      };
      byId.set(r.assessmentId, summary);
    }
    summary.total++;
    summary.counts[r.progress]++;
  }
  // Most urgent first, then newest assessment (higher id) first.
  return [...byId.values()].sort(
    (a, b) => b.counts.submitted - a.counts.submitted || b.id - a.id,
  );
}

export const uniqueSorted = (values: string[]) =>
  [...new Set(values)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
