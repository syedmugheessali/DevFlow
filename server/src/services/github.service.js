const axios = require('axios');
const GitHubIntegration = require('../models/GitHubIntegration');
const Project = require('../models/Project');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const GITHUB_API = 'https://api.github.com';

/**
 * Connect a GitHub repository to a project.
 */
async function connectRepository(projectId, userId, { repoOwner, repoName, accessToken }) {
  const project = await Project.findById(projectId);
  if (!project) {
    throw AppError.notFound('Project not found');
  }

  // Check if project already has a repo connected
  if (project.githubRepo) {
    throw AppError.conflict('This project already has a GitHub repository connected');
  }

  const repoFullName = `${repoOwner}/${repoName}`;

  // Verify repo exists and token has access
  let repoData;
  try {
    const response = await axios.get(`${GITHUB_API}/repos/${repoFullName}`, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    repoData = response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw AppError.notFound('Repository not found or you do not have access');
    }
    throw AppError.badRequest('Failed to verify GitHub repository');
  }

  const integration = await GitHubIntegration.create({
    workspace: project.workspace,
    project: projectId,
    repoOwner,
    repoName,
    repoFullName,
    repoUrl: repoData.html_url,
    defaultBranch: repoData.default_branch || 'main',
    accessToken,
    connectedBy: userId,
  });

  // Link integration to project
  project.githubRepo = integration._id;
  await project.save();

  // Return without sensitive fields
  const safeIntegration = integration.toObject();
  delete safeIntegration.accessToken;
  delete safeIntegration.webhookSecret;

  return safeIntegration;
}

/**
 * Disconnect a GitHub repository from a project.
 */
async function disconnectRepository(projectId) {
  const project = await Project.findById(projectId);
  if (!project) {
    throw AppError.notFound('Project not found');
  }

  if (project.githubRepo) {
    await GitHubIntegration.findByIdAndUpdate(project.githubRepo, { active: false });
    project.githubRepo = null;
    await project.save();
  }

  return project;
}

/**
 * Get repository info from GitHub API.
 */
async function getRepositoryInfo(integrationId) {
  const integration = await GitHubIntegration.findById(integrationId).select('+accessToken');
  if (!integration || !integration.active) {
    throw AppError.notFound('GitHub integration not found or inactive');
  }

  try {
    const headers = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (integration.accessToken) {
      headers.Authorization = `token ${integration.accessToken}`;
    }

    const response = await axios.get(
      `${GITHUB_API}/repos/${integration.repoFullName}`,
      { headers }
    );

    return {
      name: response.data.name,
      fullName: response.data.full_name,
      description: response.data.description,
      url: response.data.html_url,
      defaultBranch: response.data.default_branch,
      stars: response.data.stargazers_count,
      forks: response.data.forks_count,
      openIssues: response.data.open_issues_count,
      language: response.data.language,
      updatedAt: response.data.updated_at,
    };
  } catch (error) {
    logger.error('Failed to fetch repo info:', error.message);
    throw AppError.internal('Failed to fetch repository information from GitHub');
  }
}

/**
 * Get recent commits from GitHub.
 */
async function getRecentCommits(integrationId, { perPage = 10 } = {}) {
  const integration = await GitHubIntegration.findById(integrationId).select('+accessToken');
  if (!integration || !integration.active) {
    return [];
  }

  try {
    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (integration.accessToken) {
      headers.Authorization = `token ${integration.accessToken}`;
    }

    const response = await axios.get(
      `${GITHUB_API}/repos/${integration.repoFullName}/commits`,
      {
        headers,
        params: { per_page: perPage },
      }
    );

    return response.data.map((c) => ({
      sha: c.sha,
      shortSha: c.sha.substring(0, 7),
      message: c.commit.message,
      author: c.commit.author.name,
      date: c.commit.author.date,
      url: c.html_url,
    }));
  } catch (error) {
    logger.error('Failed to fetch commits:', error.message);
    return [];
  }
}

/**
 * Get open pull requests from GitHub.
 */
async function getPullRequests(integrationId, { state = 'open', perPage = 10 } = {}) {
  const integration = await GitHubIntegration.findById(integrationId).select('+accessToken');
  if (!integration || !integration.active) {
    return [];
  }

  try {
    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (integration.accessToken) {
      headers.Authorization = `token ${integration.accessToken}`;
    }

    const response = await axios.get(
      `${GITHUB_API}/repos/${integration.repoFullName}/pulls`,
      {
        headers,
        params: { state, per_page: perPage, sort: 'updated', direction: 'desc' },
      }
    );

    return response.data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      url: pr.html_url,
      author: pr.user.login,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      merged: pr.merged_at !== null,
      mergedAt: pr.merged_at,
      draft: pr.draft,
    }));
  } catch (error) {
    logger.error('Failed to fetch pull requests:', error.message);
    return [];
  }
}

module.exports = {
  connectRepository,
  disconnectRepository,
  getRepositoryInfo,
  getRecentCommits,
  getPullRequests,
};
