// send-notification-on-change.js
//
// called by the code-path-changes.yml workflow, this script queries github for
// the changes in the current PR, checks the config file for whether any of those
// file paths are set to alert an email address, and sends email to multiple
// parties if needed

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

async function getAccessToken(clientId, clientSecret, refreshToken) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`OAuth token request failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Failed to fetch access token:', error.message);
    process.exit(1);
  }
}

(async () => {
  const configFilePath = path.join(__dirname, 'codepath-notification');
  const repo = process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.GITHUB_PR_NUMBER;
  const token = process.env.GITHUB_TOKEN;

  // Generate OAuth2 access token
  const clientId = process.env.OAUTH2_CLIENT_ID;
  const clientSecret = process.env.OAUTH2_CLIENT_SECRET;
  const refreshToken = process.env.OAUTH2_REFRESH_TOKEN;

  // validate params
  if (!repo || !prNumber || !token || !clientId || !clientSecret || !refreshToken) {
    console.error('Missing required environment variables.');
    process.exit(1);
  }

  // the whole process is in a big try/catch. e.g. if the config file doesn't exist, github is down, etc.
  try {
    // Read and process the configuration file
    const configFileContent = fs.readFileSync(configFilePath, 'utf-8');
    const configRules = configFileContent
      .split('\n')
      .filter(line => line.trim() !== '' && !line.trim().startsWith('#')) // Ignore empty lines and comments
      .map(line => {
        const [regex, email] = line.split(':').map(part => part.trim());
        return { regex: new RegExp(regex), email };
      });

    // Fetch all changed files from github (paginated)
    const [owner, repoName] = repo.split('/');
    const changedFiles = [];
    let url = `https://api.github.com/repos/${owner}/${repoName}/pulls/${prNumber}/files?per_page=100`;
    while (url) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (!response.ok) {
        throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      changedFiles.push(...data.map(file => file.filename));

      // Follow pagination via Link header
      const link = response.headers.get('link') || '';
      const next = link.match(/<([^>]+)>;\s*rel="next"/);
      url = next ? next[1] : null;
    }
    console.log('Changed files:', changedFiles);

    // match file pathnames that are in the config and group them by email address
    const matchesByEmail = {};
    changedFiles.forEach(file => {
      configRules.forEach(rule => {
        if (rule.regex.test(file)) {
          if (!matchesByEmail[rule.email]) {
            matchesByEmail[rule.email] = [];
          }
          matchesByEmail[rule.email].push(file);
        }
      });
    });

    // Exit successfully if no matches were found
    if (Object.keys(matchesByEmail).length === 0) {
      console.log('No matches found. Exiting successfully.');
      process.exit(0);
    }

    console.log('Grouped matches by email:', matchesByEmail);

    // get ready to email the changes
    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

    // Configure Nodemailer with OAuth2
    //  service: 'Gmail',
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: 'info@prebid.org',
        clientId: clientId,
        clientSecret: clientSecret,
        refreshToken: refreshToken,
        accessToken: accessToken
      },
    });

    // Send one email per recipient
    for (const [email, files] of Object.entries(matchesByEmail)) {
      const emailBody = `
        ${email},
        <p>
        Files relevant to your integration have been changed in open source ${repo}. The <a href="https://github.com/${repo}/pull/${prNumber}">pull request is #${prNumber}</a>. These are the files you monitor that have been modified:
        <ul>
          ${files.map(file => `<li>${file}</li>`).join('')}
        </ul>
      `;

      try {
        await transporter.sendMail({
          from: `"Prebid Info" <info@prebid.org>`,
          to: email,
          subject: `Files have been changed in open source ${repo}`,
          html: emailBody,
        });

        console.log(`Email sent successfully to ${email}`);
        console.log(`${emailBody}`);
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
