-- Dashboard telemetry aggregation RPC and supporting indexes

CREATE OR REPLACE FUNCTION public.get_dashboard_telemetry(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
WITH target_user AS (
  SELECT u.id, u.name, u.avatar, u.headline, u.bio, u.skills, u.completed_projects, u.connections, u.search_appearances
  FROM users u
  WHERE u.id = p_user_id
),
profile_score AS (
  SELECT
    CASE
      WHEN tu.id IS NULL THEN 0
      ELSE LEAST(
        (CASE WHEN tu.avatar IS NOT NULL THEN 10 ELSE 0 END)
        + (CASE WHEN tu.headline IS NOT NULL THEN 10 ELSE 0 END)
        + (CASE WHEN tu.bio IS NOT NULL THEN 20 ELSE 0 END)
        + (CASE WHEN COALESCE(array_length(tu.skills, 1), 0) > 0 THEN 20 ELSE 0 END)
        + (CASE WHEN COALESCE(tu.completed_projects, 0) > 0 THEN 20 ELSE 0 END)
        + (CASE WHEN COALESCE(tu.connections, 0) > 0 THEN 20 ELSE 0 END),
        100
      )
    END AS profile_completeness
  FROM target_user tu
),
metric_counts AS (
  SELECT
    (SELECT COUNT(*)::int FROM user_opportunities uo WHERE uo.user_id = p_user_id) AS matches,
    (SELECT COUNT(*)::int FROM messages m WHERE m.receiver_id = p_user_id AND m.unread = true) AS unread_messages,
    (SELECT COUNT(*)::int FROM connections c WHERE c.receiver_id = p_user_id AND c.status = 'pending') AS pending_requests
),
profile_views_last_7 AS (
  SELECT COALESCE(SUM(v.val), 0)::int AS profile_views_7d
  FROM (
    SELECT COALESCE((e.item->>'value')::int, (e.item->>'views')::int, 0) AS val
    FROM analytics_data ad,
         LATERAL jsonb_array_elements(
           CASE
             WHEN jsonb_typeof(ad.profile_views) = 'array' THEN ad.profile_views
             ELSE '[]'::jsonb
           END
         ) WITH ORDINALITY AS e(item, ord)
    WHERE ad.user_id = p_user_id
    ORDER BY e.ord DESC
    LIMIT 7
  ) v
),
new_connections_7d AS (
  SELECT COUNT(*)::int AS new_connections_7d
  FROM connections c
  WHERE c.status = 'accepted'
    AND (c.requester_id = p_user_id OR c.receiver_id = p_user_id)
    AND COALESCE(c.connected_date, c.created_at) >= NOW() - INTERVAL '7 days'
),
top_recommendation AS (
  SELECT
    o.id AS opportunity_id,
    o.title,
    o.company AS organization,
    o.location,
    uo.match_score,
    CASE
      WHEN jsonb_typeof(uo.match_reasons) = 'array' THEN uo.match_reasons
      WHEN uo.match_reasons IS NULL THEN '[]'::jsonb
      ELSE jsonb_build_array(uo.match_reasons::text)
    END AS match_reasons
  FROM user_opportunities uo
  JOIN opportunities o ON o.id = uo.opportunity_id
  WHERE uo.user_id = p_user_id
    AND o.is_active = true
    AND o.is_expired = false
  ORDER BY uo.match_score DESC, uo.updated_at DESC
  LIMIT 1
),
assembled AS (
  SELECT jsonb_build_object(
    'user', jsonb_build_object(
      'id', tu.id,
      'name', tu.name,
      'profileCompleteness', COALESCE(ps.profile_completeness, 0),
      'searchAppearancesTotal', COALESCE(tu.search_appearances, 0)
    ),
    'monumentalMetrics', jsonb_build_object(
      'matches', COALESCE(mc.matches, 0),
      'unreadMessages', COALESCE(mc.unread_messages, 0),
      'pendingRequests', COALESCE(mc.pending_requests, 0)
    ),
    'weeklyTelemetry', jsonb_build_object(
      'profileViews7d', COALESCE(pv.profile_views_7d, 0),
      'newConnections7d', COALESCE(nc.new_connections_7d, 0)
    ),
    'recommendation', CASE
      WHEN tr.opportunity_id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'opportunityId', tr.opportunity_id,
        'title', tr.title,
        'organization', tr.organization,
        'location', NULLIF(tr.location, ''),
        'topMatchProbability', GREATEST(0, LEAST(100, ROUND(COALESCE(tr.match_score, 0))::int)),
        'matchScoreRaw', COALESCE(tr.match_score, 0),
        'matchReasons', COALESCE(tr.match_reasons, '[]'::jsonb),
        'computedAt', to_char(timezone('utc', now()), 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"')
      )
    END
  ) AS payload
  FROM target_user tu
  LEFT JOIN profile_score ps ON true
  LEFT JOIN metric_counts mc ON true
  LEFT JOIN profile_views_last_7 pv ON true
  LEFT JOIN new_connections_7d nc ON true
  LEFT JOIN top_recommendation tr ON true
)
SELECT payload FROM assembled;
$$;

CREATE INDEX IF NOT EXISTS idx_user_opportunities_user_score
  ON user_opportunities (user_id, match_score DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread
  ON messages (receiver_id)
  WHERE unread = true;

CREATE INDEX IF NOT EXISTS idx_connections_receiver_pending
  ON connections (receiver_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_connections_requester_accepted_date
  ON connections (requester_id, connected_date DESC)
  WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_connections_receiver_accepted_date
  ON connections (receiver_id, connected_date DESC)
  WHERE status = 'accepted';
