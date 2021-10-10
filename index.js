'use strict';

const fs = require('fs');
const _ = require('lodash');

class InfoJson {
	constructor(serverless, options) {
		this.serverless = serverless;
		this.options = options;
		this.provider = this.serverless.getProvider('aws');

		this.commands = {
			info: {
				options: {
					json: {
						usage: 'Output as JSON',
						shortcut: 'j',
						type: 'boolean',
					},
					file: {
						usage: 'Output to a file',
						shortcut: 'f',
						type: 'string',
					}
				}
			}
		};

		this.hooks = {
			'before:info:info': this.patchInfoPlugin.bind(this)
		};
	}

	getInfoPlugin() {
		return this.serverless.pluginManager.getPlugins().find((element) => element.constructor.name === 'AwsInfo');
	}

	patchInfoPlugin() {
		if (this.options.file) {
			const s = fs.createWriteStream(this.options.file);
			process.stdout.write = process.stderr.write = s.write.bind(s);
			process.on('exit', () => {
				s.end();
			});
		}
		if (this.options.json) {
			const infoPlugin = this.getInfoPlugin();

			// <1.13.0
			infoPlugin.display = this.displayJson.bind(this);

			// >=1.13.0
			infoPlugin.displayServiceInfo = this.displayJson.bind(this);
			infoPlugin.displayApiKeys = () => {};
			infoPlugin.displayEndpoints = () => {};
			infoPlugin.displayFunctions = () => {};
			infoPlugin.displayStackOutputs = () => {};
			infoPlugin.displayLayers = () => {};
		}
	}

	displayJson() {
		const gatheredData = this.getInfoPlugin().gatheredData;
		let data = {
			info: {
				service: gatheredData.info.service,
				stage: gatheredData.info.stage,
				region: gatheredData.info.region,
				apiKeys: gatheredData.info.apiKeys,
				endpoints: gatheredData.info.endpoints,
				functions: {},
				layers: []
			}
		};

		gatheredData.info.apiKeys.forEach((key) => {
			data.info.apiKeys[key.name] = key.value;
		});

		if (gatheredData.info.endpoints) {
			data.info.functionEndpoints = [];
			_.forEach(this.serverless.service.functions, (functionObject) => {
				functionObject.events.forEach(event => {
					if (event.http) {
						let method;
						let path;

						if (typeof event.http === 'object') {
							method = event.http.method.toUpperCase();
							path = event.http.path;
						} else {
							method = event.http.split(' ')[0].toUpperCase();
							path = event.http.split(' ')[1];
						}
						path = path !== '/' ? `/${path.split('/').filter(p => p !== '').join('/')}` : '';

						data.info.functionEndpoints.push({method, path});
					}
				});
			});
		}

		if (gatheredData.info.layers) {
			gatheredData.info.layers.forEach((layer) => {
				data.info.layers[layer.name] = layer.arn;
			});
		}

		gatheredData.info.functions.forEach((func) => {
			data.info.functions[func.name] = func.deployedName;
		});

		if (this.options.verbose) {
			data.outputs = {};
			gatheredData.outputs.forEach((output) => {
				data.outputs[output.OutputKey] = output.OutputValue;
			});
		}

		this.serverless.cli.consoleLog(JSON.stringify(data, null, 2));
	}
}

module.exports = InfoJson;
