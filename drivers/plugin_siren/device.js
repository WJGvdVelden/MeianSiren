'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes, debug } = require('zigbee-clusters');
const MeianIasWdCluster = require('./MeianIasWdCluster');

Cluster.addCluster(MeianIasWdCluster); 

class plugin_siren extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Plugin Sirene installed');
    this.printNode();

    // Standaard capabilities
    this.registerCapability('onoff', CLUSTER.ON_OFF);

    // Custom capabilities
    this.registerCapabilityListener('alarmToggle', async value => {
      this.log(`Alarm button: ${value ? 'ON' : 'OFF'}`);
      if (value) {
        await this._startAlarm();
      } else {
        await this._stopAlarm();
      }
    });

    // initial value is false
    if (this.isFirstInit() === true) {
      await this.setCapabilityValue('alarmToggle', false)
      .catch(err => { this.error(err); "alarmToggle not set properly" });
    }

    // Flow Action Cards
    // Start Alarm
    this.homey.flow
      .getActionCard('start_alarm')
      .registerRunListener(async (args, state) => {
        const cluster = this.zclNode.endpoints[1].clusters.iasWD;
        const warningInfo = this._mapAlarmMode(args.mode);
        const duration = args.duration || 60;
        const volume = args.volume || 100;

        // Step 1: write attributes as attributes controls the specifics of the siren
        await cluster.writeAttributes({
          alarmDuration: duration,
          alarmVolume: volume,
        });
        // Step 2: Trigger the alarm
        await this.zclNode.endpoints[1].clusters.iasWD.startWarning({
          warningInfo,
          warningDuration: duration,
        });

        // Mirror UI
        await this.setCapabilityValue('alarmToggle', true).catch(this.error);

        // Auto-reset UI
        clearTimeout(this._alarmTimeout);
        this._alarmTimeout = setTimeout(async () => {
          await this.setCapabilityValue('alarmToggle', false).catch(this.error);
        }, duration * 1000);

        return true;
      });

    // Stop Alarm
    this.homey.flow
      .getActionCard('stop_alarm')
      .registerRunListener(async () => {
        await this._stopAlarm();
      });

    // Set Volume
    this.homey.flow
      .getActionCard('set_volume')
      .registerRunListener(async (args) => {
        await this.zclNode.endpoints[1].clusters.iasWD.writeAttributes({
          alarmVolume: args.volume,
        });
        return true;
      });

    // Trigger Doorbell, use the standard volume setting for doorbell
    this.homey.flow
      .getActionCard('trigger_doorbell')
      .registerRunListener(async () => {
        await this.zclNode.endpoints[1].clusters.iasWD.writeAttributes({ doorbellTrigger: 1 });
        // Second chime after 1 second to reset trigger attribute
        setTimeout(async () => {
        await this.zclNode.endpoints[1].clusters.iasWD.writeAttributes({ doorbellTrigger: 0 });
          }, 1000);
        return true;
      });
  }

  async _startAlarm() {
    const cluster = this.zclNode.endpoints[1].clusters.iasWD;

    // Read settings
    const duration = this.getSetting('alarmDuration') || 60;
    const volume = this.getSetting('alarmVolume') || 100;
    const alarmSetting = this.getSetting('defaultAlarm') || "both"; 
    const warningInfo = this._mapAlarmMode(alarmSetting);
    
    this.log('Starting alarm with:', { duration, volume, warningInfo });

    // Step 1: write attributes
    await cluster.writeAttributes({
      alarmDuration: duration,
      alarmVolume: volume,
    });

    // Step 2: send command (trigger)
    await cluster.startWarning({
      warningInfo,
      warningDuration: duration, // ignored, but required in signature
    });

    // set a timer to clear the UI component
    // Auto-reset after duration
    clearTimeout(this._alarmTimer);
    this._alarmTimer = setTimeout(() => {
      this.setCapabilityValue('alarmToggle', false);
    }, duration * 1000);

    // Update UI capability so flows stay in sync
    await this.setCapabilityValue('alarmToggle', true);
  }

  // Translate default alarm setting to bit-value for the warning command
  _mapAlarmMode(mode) {
      const modes = {
      sound: 0x11,
      strobe: 0x21,
      both: 0x31,
    };
    return modes[mode] ?? 0x31; // fallback to both if unknown
  }

  async _stopAlarm() {
    const cluster = this.zclNode.endpoints[1].clusters.iasWD;

    this.log('Stopping alarm');

    // trigger with duration=0 (failsafe)
    await cluster.startWarning({ warningInfo: 0x00, warningDuration: 0 });
    
    // Update UI capability
    clearTimeout(this._alarmTimer);
    await this.setCapabilityValue('alarmToggle', false);
  }

  async onSettings({oldSettings, newSettings, changedKeys}) {
    let parsedValue = 0;

    if (changedKeys.includes('alarmDuration')) {
      parsedValue = parseInt(newSettings.alarmDuration);
      await this.zclNode.endpoints[1].clusters.iasWD.writeAttributes({ alarmDuration: parsedValue });
    }

    if (changedKeys.includes('alarmVolume')) {
      parsedValue = parseInt(newSettings.alarmVolume);
      await this.zclNode.endpoints[1].clusters.iasWD.writeAttributes({ alarmVolume: parsedValue });
    }

    if (changedKeys.includes('bellVolume')) {
      parsedValue = parseInt(newSettings.bellVolume);
      await this.zclNode.endpoints[1].clusters.iasWD.writeAttributes({ doorbellVolume: parsedValue });
    }

    /* Triggering doorbell and quickAlarm via settings is not usefull
    if (changedKeys.includes('doorBell')) {
      parsedValue = parseInt(newSettings.doorBell);
      await this.zclNode.endpoints[1].clusters.iasWD.writeAttributes({ doorbellTrigger: parsedValue });
    }
    if (changedKeys.includes('quickAlarm')) {
      parsedValue = parseInt(newSettings.quickAlarm);
      await this.zclNode.endpoints[1].clusters.iasWD.writeAttributes({ quickTrigger: parsedValue });
    }
    // The use of the device specific attribute is not known
    if (changedKeys.includes('specific')) {
      parsedValue = parseInt(newSettings.specific);
      await this.zclNode.endpoints[1].clusters.iasWD.writeAttributes({ specific: parsedValue });
    }
    // Changing the cycle time of the strobe does not seem to work
    if (changedKeys.includes('strobeCycle')) {
      parsedValue = parseInt(newSettings.strobeCycle);
      await this.zclNode.endpoints[1].clusters.iasWD.writeAttributes({ strobeDutyCycle: parsedValue });
    }
    */

  };

}

module.exports = plugin_siren;
