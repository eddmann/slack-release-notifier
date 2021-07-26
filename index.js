const fs = require('fs');
const core = require('@actions/core');
const axios = require('axios');
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
        tag: event.deployment.ref.replace('refs/tags/', ''),
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

const removeImages = message => message.replace(/<img[^>]+\>/g, '');

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
          toSlackUserMentions(
            toSlackHeadings(removeImages(release.body))
          )
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

    await axios({
      headers: { 'Content-Type': 'application/json' },
      url: core.getInput('slackWebhookEndpointUrl'),
      method: 'POST',
      data: JSON.stringify(message),
    });
  } catch (error) {
    core.setFailed(error.message);
    core.info(JSON.stringify(error.response.data));
  }
}

run();
