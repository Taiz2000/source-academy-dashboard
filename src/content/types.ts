// Shape of GET /v2/courses/{id}/admin/grading (see backend admin_grading_view.ex "gradingsummary.json").

export type RawUser = {
  id: number;
  name: string;
  username: string;
  groupName: string | null;
  groupLeaderId: number | null;
};

export type SubmissionStatus = 'not_attempted' | 'attempting' | 'attempted' | 'submitted';

export type RawSubmission = {
  id: number;
  status: SubmissionStatus;
  /** null for team submissions. */
  student: RawUser | null;
  assessment: {
    id: number;
    type: string;
    title: string;
    isManuallyGraded: boolean;
    maxXp: number;
    questionCount: number;
    assessmentNumber: string;
  };
  team: { id: number; team_members: (RawUser | null)[] } | null;
  /** null when the submission has no answers yet (left join in the backend). */
  xp: number | null;
  gradedCount: number;
  xpBonus: number;
  xpAdjustment: number | null;
  unsubmittedBy: { id: number; name: string } | null;
  unsubmittedAt: string | null;
  isGradingPublished: boolean;
};

export type RawGradingResponse = { count: number; data: RawSubmission[] };
