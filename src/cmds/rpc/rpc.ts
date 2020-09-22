import { Func } from "mocha";

const errors = require('web3-core-helpers').errors;
const jsonrpc = require("web3-core-requestmanager/src/jsonrpc");
const ethers = require("ethers");

export function parseError(result): Error {
	var message: string = !!result && !!result.error && !!result.error.message ? result.error.message : JSON.stringify(result);
	return new Error('Returned error: ' + message);
}

export interface IRunnerOpts {
	debug?: boolean;
	logger?: Function;
	onlyEndpoints?: boolean;
}

export class Runner {
	report: any = {};
	debug: boolean = false;
	onlyEndpoints: boolean = false;
	logger: Function = function(msg) {this.debug ? console.log(msg) : null};

	constructor(opts: IRunnerOpts) {
		this.report = {};
		this.debug = opts.debug
		this.logger = opts.logger;
		this.onlyEndpoints = opts.onlyEndpoints;
		this.execute = this.execute.bind(this);
		this.update = this.update.bind(this);
	}

	jsonHandler(callback, payload, expected) {
		return function(err, result) {
			if(result && result.id && payload.id !== result.id) {
				return callback(payload, new Error(`Wrong response id ${result.id} (expected: ${payload.id}) in ${JSON.stringify(payload)}`));
			}
			if (err) {
				return callback(payload, err);
			}
			if (result && result.error) {
				return callback(payload, parseError(result));
			}
			if (!jsonrpc.isValidResponse(result)) {
				return callback(payload, errors.InvalidResponse(result));
			}
			callback(payload, null, result.result, expected);
		}
	};

	execute(payload, error, res, expected) {
		if (error && typeof error === 'string' && error.toLowerCase().includes("invalid json rpc response")) {
			throw new Error("JSON RPC Server not working!")
	
		}
		// Parse different error values
		let err;
		if (error && error.data && error.data.stack) {
			err = error.data.stack.toLowerCase();
		} else if (error && error.message) {
			err = error.message.toLowerCase();
		}

		if (err) {
			if (err.includes("not supported.") || err.includes("does not exist")) {
				this.logger(`[ERR] The method: ${payload.method} does not exist!`);
				this.update(payload.method, false, false);

			} else if (err.includes("missing value") || err.includes("incorrect number of arguments") || err.includes("cannot read")) {
				this.logger(`[ERR] The payload for: ${payload.method} was missing values: ${err}`);
				this.update(payload.method, true, false);
			} else {
				this.logger(`[ERR] The method: ${payload.method} had an error we couldn't parse: ${err}`);
				this.update(payload.method, false, false);

			}

		} else if (!this.onlyEndpoints && res !== expected) {
				this.logger(`[ERR] The method: ${payload.method} returned: ${res}, expected: ${expected}`)
				this.update(payload.method, true, false);

		} else {
			this.update(payload.method, true, true);
		}
	}

	update(method, implemented, result) {
		if (this.onlyEndpoints) {
			this.report[method] = {
				implemented
			}
		} else {
			this.report[method] = {
				implemented,
				result
			}
		}
	}

	log() {
		const table = [];
		for (let key in this.report) {
			const item = this.report[key];
			if (this.onlyEndpoints) {
				table.push({method: key, implemented: item.implemented})
			} else {
				table.push({method: key, implemented: item.implemented, returns: item.result})
			}
		}
		console.table(table);
	}
}

export const executeTransfer = async (wallets, test) => {
	const w = wallets[test.from];
	await w.sendTransaction({
		to: test.to,
		value: ethers.utils.arrayify(test.amount)
	})
}