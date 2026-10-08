# @luxass/pi-personal

Collects [Pi](https://pi.dev) extensions that are tuned to a single personal workflow rather than general enough to ship on their own.

## Install

```sh
pi install npm:@luxass/pi-personal
```

## What it does

The package registers a `session_start` hook. When a session starts, Pi shows a notification confirming the extension loaded.

That is the whole of it today. The package is a home for defaults that suit one workflow, and each addition is meant to be edited in place as that workflow changes rather than configured through settings.
