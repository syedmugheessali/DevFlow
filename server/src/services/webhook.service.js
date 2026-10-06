const crypto = require('crypto');
const GitHubEvent = require('../models/GitHubEvent');
const GitHubIntegration = require('../models/GitHubIntegration');
const Issue = require('../models/Issue');
const { recordActivity } = require('./activity.service');
const { createNotification } = require('./notification.service');
const { getIO } = require('../config/socket');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Verify GitHub webhook signature using HMAC SHA-256.
 * Rejects requests with invalid or missing signatures.
 */
function verifySignature(payload, signature) {
  if (!signature) return false;

  const secret = config.github.webhookSecret;
  if (!secret) {
    logger.warn('GITHUB_WEBHOOK_SECRET not configured — skipping verification');
    return true; // Allow in dev if not configured
  }

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeCompare(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

/**
 * Extract DevFlow issue keys from text.
 * Matches patterns like "DF-42", "fix DF-42", "Closes DF-42".
 * Requires the key format: 2-10 uppercase letters, dash, number.
 * Avoids false positives by requiring the project key prefix.
 */
function extractIssueKeys(text, projectKey) {
  if (!text || !projectKey) return [];

  // Match the specific project key followed by a dash and number
  const regex = new RegExp(`\\b${projectKey}-(\\d+)\\b`, 'gi');
  const matches = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    matches.push(`${projectKey}-${match[1]}`.toUpperCase());
  }

  return [...new Set(matches)]; // Deduplicate
}

/**
 * Process a GitHub webhook event.
 * Handles idempotency via deliveryId.
 */
async function processWebhook(deliveryId, eventType, payload) {
  // Idempotency check: skip if already processed
  const existing = await GitHubEvent.findOne({ deliveryId });
  if (existing) {
    logger.debug(`Webhook ${deliveryId} already processed, skipping`);
    return { duplicate: true };
  }

  // Find the integration for this repository
  const repoFullName = payload.repository?.full_name;
  if (!repoFullName) {
    logger.warn('Webhook missing repository info');
    return { error: 'Missing repository info' };
  }

  const integration = await GitHubIntegration.findOne({
    repoFullName,
    active: true,
  });

  if (!integration) {
    logger.debug(`No integration found for ${repoFullName}`);
    return { error: 'No integration found' };
  }

  const action = payload.action || '';

  // Create the event record
  const event = await GitHubEvent.create({
    deliveryId,
    eventType,
    action,
    integration: integration._id,
    project: integration.project,
    workspace: integration.workspace,
    data: extractEventData(eventType, payload),
    processed: true,
  });

  // Get the project to know its key
  const Project = require('../models/Project');
  const project = await Project.findById(integration.project);
  const projectKey = project?.key;

  // Process different event types
  let linkedIssues = [];

  switch (eventType) {
    case 'push':
      linkedIssues = await processPushEvent(payload, integration, projectKey);
      break;
    case 'pull_request':
      linkedIssues = await processPullRequestEvent(payload, integration, projectKey, action);
      break;
    default:
      logger.debug(`Unhandled webhook event type: ${eventType}`);
  }

  // Update event with linked issues
  if (linkedIssues.length > 0) {
    event.linkedIssues = linkedIssues;
    await event.save();
  }

  // Emit webhook activity to connected clients
  const io = getIO();
  io.to(`project:${integration.project}`).emit('github:event', {
    eventType,
    action,
    data: event.data,
  });

  return { processed: true, linkedIssues: linkedIssues.length };
}

/**
 * Extract relevant data from webhook payload (not the entire payload).
 */
function extractEventData(eventType, payload) {
  switch (eventType) {
    case 'push':
      return {
        ref: payload.ref,
        before: payload.before,
        after: payload.after,
        pusher: payload.pusher?.name,
        commits: (payload.commits || []).map((c) => ({
          id: c.id,
          shortId: c.id?.substring(0, 7),
          message: c.message,
          author: c.author?.name,
          url: c.url,
          timestamp: c.timestamp,
        })),
        compareUrl: payload.compare,
      };

    case 'pull_request':
      return {
        number: payload.pull_request?.number,
        title: payload.pull_request?.title,
        state: payload.pull_request?.state,
        url: payload.pull_request?.html_url,
        author: payload.pull_request?.user?.login,
        merged: payload.pull_request?.merged,
        mergedAt: payload.pull_request?.merged_at,
        headBranch: payload.pull_request?.head?.ref,
        baseBranch: payload.pull_request?.base?.ref,
      };

    default:
      return { raw: 'Unhandled event type' };
  }
}

/**
 * Process push events — link commits to DevFlow issues.
 */
async function processPushEvent(payload, integration, projectKey) {
  const linkedIssueIds = [];

  for (const commit of (payload.commits || [])) {
    const issueKeys = extractIssueKeys(commit.message, projectKey);

    for (const key of issueKeys) {
      const issue = await Issue.findOne({ key });
      if (!issue) continue;

      linkedIssueIds.push(issue._id);

      await recordActivity({
        action: 'commit_linked',
        actor: null, // System/webhook
        workspace: integration.workspace,
        project: integration.project,
        issue: issue._id,
        metadata: {
          issueKey: key,
          commitSha: commit.id?.substring(0, 7),
          commitMessage: commit.message,
          commitAuthor: commit.author?.name,
          commitUrl: commit.url,
        },
      });
    }
  }

  return linkedIssueIds;
}

/**
 * Process pull_request events — link PRs to DevFlow issues.
 */
async function processPullRequestEvent(payload, integration, projectKey, action) {
  const pr = payload.pull_request;
  if (!pr) return [];

  const linkedIssueIds = [];

  // Extract issue keys from PR title and body
  const issueKeys = [
    ...extractIssueKeys(pr.title, projectKey),
    ...extractIssueKeys(pr.body, projectKey),
    ...extractIssueKeys(pr.head?.ref, projectKey), // Branch name like "fix/DF-42"
  ];
  const uniqueKeys = [...new Set(issueKeys)];

  for (const key of uniqueKeys) {
    const issue = await Issue.findOne({ key });
    if (!issue) continue;

    linkedIssueIds.push(issue._id);

    let activityAction;
    switch (action) {
      case 'opened':
        activityAction = 'pr_opened';
        break;
      case 'closed':
        activityAction = pr.merged ? 'pr_merged' : 'pr_closed';
        break;
      default:
        continue; // Skip other actions like 'edited', 'labeled', etc.
    }

    await recordActivity({
      action: activityAction,
      actor: null,
      workspace: integration.workspace,
      project: integration.project,
      issue: issue._id,
      metadata: {
        issueKey: key,
        prNumber: pr.number,
        prTitle: pr.title,
        prUrl: pr.html_url,
        prAuthor: pr.user?.login,
        merged: pr.merged,
      },
    });

    // Auto-transition: when PR is merged, move issue to "in_review" or "done"
    if (action === 'closed' && pr.merged) {
      if (issue.status !== 'done') {
        const newStatus = issue.status === 'in_review' ? 'done' : 'in_review';
        issue.status = newStatus;
        if (newStatus === 'done') {
          issue.closedAt = new Date();
        }
        await issue.save();

        await recordActivity({
          action: 'status_changed',
          actor: null,
          workspace: integration.workspace,
          project: integration.project,
          issue: issue._id,
          metadata: {
            issueKey: key,
            from: issue.status,
            to: newStatus,
            reason: 'PR merged',
          },
        });
      }

      // Notify assignee
      if (issue.assignee) {
        await createNotification({
          recipient: issue.assignee,
          type: 'pr_merged',
          title: 'Pull Request Merged',
          message: `PR #${pr.number} merged for ${key}: ${issue.title}`,
          resource: { type: 'issue', id: issue._id },
          workspace: integration.workspace,
        });
      }
    }

    // Notify assignee about PR opened
    if (action === 'opened' && issue.assignee) {
      await createNotification({
        recipient: issue.assignee,
        type: 'pr_opened',
        title: 'Pull Request Opened',
        message: `PR #${pr.number} opened for ${key}: ${pr.title}`,
        resource: { type: 'issue', id: issue._id },
        workspace: integration.workspace,
      });
    }
  }

  return linkedIssueIds;
}

module.exports = {
  verifySignature,
  processWebhook,
  extractIssueKeys,
};
