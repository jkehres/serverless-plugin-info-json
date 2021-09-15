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
				endpoints: [],
				functions: {},
				layers: []
			}
		};
		if (gatheredData.info.endpoints) {
			_.forEach(this.serverless.service.functions, (functionObject) => {
				functionObject.events.forEach(event => {
					if (event.httpApi) {
						let method;
						let path;
						let baseUrl;

						if (typeof event.httpApi === 'object') {
							method = event.httpApi.method.toUpperCase();
							path = event.httpApi.path;
						} else {
							method = event.httpApi.split(' ')[0].toUpperCase();
							path = event.httpApi.split(' ')[1];
						}
						path = path !== '/' ? `/${path.split('/').filter(p => p !== '').join('/')}` : '/';
						gatheredData.info.endpoints.forEach(endpoint => {
							if (endpoint.includes("httpApi:")) {
								baseUrl = endpoint.replace("httpApi: ", "")
							}
						})
						data.info.endpoints.push({method, path, baseUrl});
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
