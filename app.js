'use strict';

const Homey = require('homey');
const { debug } = require('zigbee-clusters');
debug(true);

class MeianZigbee extends Homey.App {
	
	onInit() {
		this.log('Meian Zigbee app is running...')
	}
	
}

module.exports = MeianZigbee;