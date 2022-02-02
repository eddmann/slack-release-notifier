# Slack Release Notifier

Used at [MyBuilder](https://www.mybuilder.com/) to notify the team upon successful deployment of a GitHub release.

## Usage

We use [Release Drafter](https://github.com/release-drafter/release-drafter) to compile the release notes based on merged pull requests.
Once this draft release has been published and a successful deployment has occurred, this GitHub Action is invoked which notifies the team via a dedicated Slack channel.
As the release notes include the contributing GitHub usernames, we are able to lookup the associated Slack member identities and _mention_ them directly within the release notification.
This provides a trivial means of making interested parities aware of the changes that have just gone live.

```yaml
name: Notify Team via Slack about Release
on: deployment_status
jobs:
  notify:
    if: ${{ github.event.deployment_status.state == 'success' }}
    runs-on: ubuntu-20.04
    steps:
      - name: Notify Team
        uses: eddmann/slack-release-notifier@v1
        with:
          slackTitle: 'Your changes are live!'
          slackHeading: 'Gone Live - {tag_name}'
          gitHubSlackUserLookup: '{"@GitHubUsername":"SlackMemberId"}'
          slackWebhookEndpointUrl: ${{ secrets.RELEASE_SLACK_WEBHOOK_URL }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Alternatively, you can emit the notification upon the release being published.

```yaml
name: Notify Team via Slack about Release
on:
  release:
    types: [published]
jobs:
  notify:
    runs-on: ubuntu-20.04
    steps:
      - name: Notify Team
        uses: eddmann/slack-release-notifier@v1
        with:
          slackTitle: 'Your changes are live!'
          slackHeading: 'Gone Live - {tag_name}'
          gitHubSlackUserLookup: '{"@GitHubUsername":"SlackMemberId"}'
          slackWebhookEndpointUrl: ${{ secrets.RELEASE_SLACK_WEBHOOK_URL }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
