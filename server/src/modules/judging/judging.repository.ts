import { pool } from "../../db/pool.js";

export const judgingRepository = {
  async listSubmittedProjects(eventId: string) {
    const result = await pool.query(
      `SELECT p.*, t.name AS team_name
       FROM project_submissions p
       JOIN teams t ON t.id = p.team_id
       WHERE p.event_id = $1 AND p.status = 'submitted'
       ORDER BY p.submitted_at ASC`,
      [eventId]
    );
    return result.rows;
  },

  async findProjectById(eventId: string, projectId: string) {
    const result = await pool.query(
      `SELECT p.*, t.name AS team_name
       FROM project_submissions p
       JOIN teams t ON t.id = p.team_id
       WHERE p.event_id = $1 AND p.id = $2`,
      [eventId, projectId]
    );
    return result.rows[0] ?? null;
  },

  async findByProjectAndJudge(projectSubmissionId: string, judgeUserId: string) {
    const result = await pool.query(
      `SELECT * FROM judging_scores
       WHERE project_submission_id = $1 AND judge_user_id = $2`,
      [projectSubmissionId, judgeUserId]
    );
    return result.rows[0] ?? null;
  },

  async insertScore(
    eventId: string,
    projectSubmissionId: string,
    judgeUserId: string,
    data: {
      score_total: number;
      score_innovation: number;
      score_technical: number;
      score_presentation: number;
      score_usefulness: number;
      feedback: string | null;
    }
  ) {
    // The UNIQUE(project_submission_id, judge_user_id) constraint is the
    // concurrency backstop; the service pre-check gives a friendly error.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const project = await client.query(
        `SELECT id FROM project_submissions WHERE id = $1 AND event_id = $2 FOR UPDATE`,
        [projectSubmissionId, eventId]
      );
      if (project.rows.length === 0) {
        await client.query("ROLLBACK");
        return null;
      }
      const result = await client.query(
        `INSERT INTO judging_scores
           (project_submission_id, judge_user_id, score_total, score_innovation, score_technical, score_presentation, score_usefulness, feedback)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          projectSubmissionId,
          judgeUserId,
          data.score_total,
          data.score_innovation,
          data.score_technical,
          data.score_presentation,
          data.score_usefulness,
          data.feedback,
        ]
      );
      await client.query("COMMIT");
      return result.rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async getScoreById(eventId: string, scoreId: string) {
    // Event-scoped lookup: a score is only visible through its project's event.
    const result = await pool.query(
      `SELECT s.* FROM judging_scores s
       JOIN project_submissions p ON p.id = s.project_submission_id
       WHERE s.id = $1 AND p.event_id = $2`,
      [scoreId, eventId]
    );
    return result.rows[0] ?? null;
  },

  async listScoresForProject(eventId: string, projectId: string) {
    const result = await pool.query(
      `SELECT s.*, u.full_name AS judge_name, u.email AS judge_email
       FROM judging_scores s
       JOIN users u ON u.id = s.judge_user_id
       JOIN project_submissions p ON p.id = s.project_submission_id
       WHERE s.project_submission_id = $1 AND p.event_id = $2
       ORDER BY s.submitted_at ASC`,
      [projectId, eventId]
    );
    return result.rows;
  },

  async updateScore(
    eventId: string,
    scoreId: string,
    data: {
      score_total: number;
      score_innovation: number;
      score_technical: number;
      score_presentation: number;
      score_usefulness: number;
      feedback: string | null;
    }
  ) {
    // WHERE is scoped by event so a score from another event can never be touched.
    const result = await pool.query(
      `UPDATE judging_scores s
       SET score_total = $3, score_innovation = $4, score_technical = $5,
           score_presentation = $6, score_usefulness = $7, feedback = $8
       FROM project_submissions p
       WHERE s.id = $1 AND s.project_submission_id = p.id AND p.event_id = $2
       RETURNING s.*`,
      [
        scoreId,
        eventId,
        data.score_total,
        data.score_innovation,
        data.score_technical,
        data.score_presentation,
        data.score_usefulness,
        data.feedback,
      ]
    );
    return result.rows[0] ?? null;
  },

  // Leaderboard is computed by SQL aggregation, never stored (PRD rule).
  async getLeaderboard(eventId: string) {
    const result = await pool.query(
      `WITH agg AS (
         SELECT
           p.id AS project_submission_id,
           p.title AS project_title,
           t.id AS team_id,
           t.name AS team_name,
           AVG(s.score_innovation)::numeric(5,2) AS innovation,
           AVG(s.score_technical)::numeric(5,2) AS technical,
           AVG(s.score_presentation)::numeric(5,2) AS presentation,
           AVG(s.score_usefulness)::numeric(5,2) AS usefulness,
           AVG(s.score_total)::numeric(5,2) AS total,
           COUNT(s.id)::int AS judge_count,
           ARRAY_AGG(s.feedback) FILTER (WHERE s.feedback IS NOT NULL AND s.feedback <> '') AS feedback
         FROM project_submissions p
         JOIN teams t ON t.id = p.team_id
         JOIN judging_scores s ON s.project_submission_id = p.id
         WHERE p.event_id = $1 AND p.status = 'submitted'
         GROUP BY p.id, p.title, t.id, t.name
       )
       SELECT
         project_submission_id,
         project_title,
         team_id,
         team_name,
         innovation, technical, presentation, usefulness, total,
         judge_count, feedback,
         RANK() OVER (ORDER BY total DESC)::int AS rank
       FROM agg
       ORDER BY total DESC, project_title ASC`,
      [eventId]
    );
    return result.rows.map((row: any) => ({
      project_submission_id: row.project_submission_id,
      project_title: row.project_title,
      team_id: row.team_id,
      team_name: row.team_name,
      scores: {
        innovation: Number(row.innovation),
        technical: Number(row.technical),
        presentation: Number(row.presentation),
        usefulness: Number(row.usefulness),
        total: Number(row.total),
      },
      judge_count: row.judge_count,
      feedback: row.feedback ?? [],
      rank: row.rank,
    }));
  },
};
