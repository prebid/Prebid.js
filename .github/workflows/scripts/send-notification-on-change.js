// send-notification-on-change.js
//
// called by the code-path-changes.yml workflow, this script queries github for
// the changes in the current PR, checks the config file for whether any of those
// file paths are set to alert an email address, and sends email to multiple
// parties if needed

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

(async () => {
  const configFilePath = path.join(__dirname, 'codepath-notification');
  const repo = process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.GITHUB_PR_NUMBER;
  const token = process.env.GITHUB_TOKEN;
  const sender = process.env.NOTIFICATION_EMAIL;
  const pass = process.env.NOTIFICATION_PASSWORD;

  // validate params
  if (!repo || !prNumber || !token || !sender || !pass) {
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

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: sender,
        pass
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
          from: `"Prebid Notifications" <${sender}>`,
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
