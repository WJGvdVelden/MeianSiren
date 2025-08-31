const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

class MeianIasWdCluster extends Cluster {

  static get ID() {
    return 0x0502; // IAS WD
  }

  static get NAME() {
    return 'iasWD';
  }

  static get ATTRIBUTES() {
    return {
      // Alarm duration in seconds
      alarmDuration: { id: 0x0000, type: ZCLDataTypes.uint16 },

      // Likely strobe intensity/duty cycle (0–100), has no effect
      strobeDutyCycle: { id: 0x0001, type: ZCLDataTypes.uint8 },

      // Alarm volume (0–100, Tuya-style)
      alarmVolume: { id: 0x0002, type: ZCLDataTypes.uint8 },

      // Quick trigger (5 sec siren, resets to 0)
      quickTrigger: { id: 0x0004, type: ZCLDataTypes.uint8 },

      // Doorbell trigger if value changed. Only 0 or 1 are valid values
      doorbellTrigger: { id: 0x0005, type: ZCLDataTypes.enum8({Off:0,On:1}) },

      // Doorbell volume (0–100)
      doorbellVolume: { id: 0x0006, type: ZCLDataTypes.uint8 },

      // No known effect
      specific: { id: 0xE000, type: ZCLDataTypes.uint8 },
    };
  };

  static get COMMANDS() {
    return {
      startWarning: {
        id: 0x00,
        args: { 
          warningInfo: ZCLDataTypes.uint8, // bitfield 0x11 = siren, 0x21 = strobe, 0x31 both, 0x00 off
          warningDuration: ZCLDataTypes.uint16 // ignored by Tuya device
        }, 
      },
    };
  }
}

module.exports = MeianIasWdCluster;
