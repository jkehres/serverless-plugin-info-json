# serverless-plugin-info-json

A [Serverless](https://serverless.com/) plugin that adds JSON and file output options to the [`info`](https://serverless.com/framework/docs/providers/aws/cli-reference/info/) command.

NOTE: Only supports AWS provider.

## Installation

First, install the plugin via npm:

`npm install serverless-plugin-info-json`

Second, edit your `serverless.yml` file and add the following section:

```yaml
plugins:
  - serverless-plugin-info-json
```

## Usage

In addition to the normal command line arguments provided by the `info` command, this plugin allows you use the following extra arguments as well:

* `--json` / `-j` Format output as JSON instead of text.
* `--file <FILE>` / `-f <FILE>` Send command output to the specified file instead of stdout.
