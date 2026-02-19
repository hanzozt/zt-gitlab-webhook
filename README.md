`zt-gitlab-webhook`
=====================

A Docker image usable within GitLab CI Pipelines to facilitate sending webhooks over a [Ziti Network](https://zt.dev/about) to a secure server that is "dark" on the internet (e.g. a self-hosted instance of Mattermost).

<img src="https://zt.dev/wp-content/uploads/2020/02/zt.dev_.logo_.png" width="200" />

Learn about Ziti at [zt.dev](https://zt.dev)


[![Build](https://github.com/hanzozt/zt-gitlab-webhook/workflows/Build/badge.svg?branch=main)]()
[![Issues](https://img.shields.io/github/issues-raw/hanzozt/zt-http-agent)]()
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![LOC](https://img.shields.io/tokei/lines/github/hanzozt/zt-gitlab-webhook)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=rounded)](CONTRIBUTING.md)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](CODE_OF_CONDUCT.md)



This GitLab CI Pipeline [image](https://github.com/orgs/hanzozt/packages/container/package/zt-gitlab-webhook) uses the [Ziti NodeJS SDK](https://github.com/hanzozt/zt-sdk-nodejs) to post an arbitrary JSON `payload` over a [Ziti Network](https://zt.dev/about) to a protected service.  Here, an example of a protected service could be a self-hosted instance of Mattermost that is only accessible over Ziti.

## Example usage in a .gitlab-ci.yml pipeline:
```yml
notify-job:
  image: ghcr.io/hanzozt/zt-gitlab-webhook:latest

  stage: .pre

  rules:

    # Run this job based on whatever events you are interested in. 
    # Here we run whenever updates are pushed into the repo.
    - if: '$CI_PIPELINE_SOURCE == "push"'
      when: always

  variables:

    # WEBHOOK_URL specifies the URL to post the event payload.
    # Note that the Ziti service name must match the hostname
    # in the URL (e.g. "your-mattermost.zt"). Also note that
    # "xxx-generatedkey-xxx" in this URL example should be replaced
    # with the generated key associated with the incoming webhook
    # you established on your Mattermost instance.
    WEBHOOK_URL: 'https://your-mattermost.zt/hooks/xxx-generatedkey-xxx'

    # Identity JSON containing key to access a Ziti network.
    # We suggest specifying it in a variable controlled through
    # the GitLab UI.
    ZITI_IDENTITY: '${ZITI_IDENTITY}'
  
  script:
  
    # The WEBHOOK_PAYLOAD env var should be set to an arbitrary
    # JSON salvo that will be POST'ed to the Ziti service.
    # For example, if you are using Mattermost as the target,
    # you can use the JSON format described at: 
    #     https://developers.mattermost.com/integrate/incoming-webhooks/
    #
    # GitLab exposes lots of information via pre-defined env vars,
    # and you can extract information from them and craft a payload
    # that provides value to you.
    - export WEBHOOK_PAYLOAD='{"channel":"my-channel-name", "text":"whatever text your script want to set"}'

    # Transmit the webhook to the service over Ziti
    - zt-webhook
```
## Ziti Identity

The `ZITI_IDENTITY` referenced above is the JSON formatted string of an identity enrolled  in a `Ziti` network.

The identity can be created by enrolling via the `zt edge enroll path/to/jwt [flags]` command.  The `zt` executable can be obtained [here](https://github.com/hanzozt/zt/releases/latest).
