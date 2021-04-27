const fs = require('fs');
const util = require('util');
const core = require('@actions/core');
const request = util.promisify(require('request'));
const { Octokit } = require('@octokit/action');

const fetchReleaseForEvent = async event => {
  if (event.deployment_status) {
    const octokit = new Octokit();

    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const { data } = await octokit.request(
      'GET /repos/:owner/:repo/releases/tags/:tag',
      {
        owner,
        repo,
        tag: event.deployment.ref,
      }
    );

    return data;
  }

  return event.release;
};

const toSlackHeadings = message =>
  message.replace(/^(#{1,6}(.*))$/gm, '*$2*');

const toSlackUserMentions = message => {
  const lookup = JSON.parse(core.getInput('gitHubSlackUserLookup'));
  return Object.keys(lookup).reduce(
    (body, key) =>
      body.replace(new RegExp(key, 'g'), '<@' + lookup[key] + '>'),
    message
  );
};

const toSections = message => message.split('\r\n\r\n\r\n\r\n\r\n');

async function run() {
  try {
    const release = await fetchReleaseForEvent(
      JSON.parse(
        fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')
      )
    );

    if (!release) {
      return;
    }

    const message = {
      text: core.getInput('slackTitle'),
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: Object.keys(release).reduce(
              (subject, key) =>
                subject.replace(`{${key}}`, release[key]),
              core.getInput('slackHeading')
            ),
          },
        },
        ...toSections(
          toSlackUserMentions(toSlackHeadings(release.body))
        ).map(content => ({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: content,
          },
        })),
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Release',
              },
              url: release.html_url,
            },
          ],
        },
      ],
    };

    await request.post(core.getInput('slackWebhookEndpointUrl'), {
      'Content-Type': 'application/json',
      body: JSON.stringify(message),
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
