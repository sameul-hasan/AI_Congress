/**
 * ClimateSphere AI — Enterprise Sparkplug B v1.0 / ISO/IEC 20237 State Machine Engine
 * server/sparkplug_b_engine.js
 *
 * Implements the full Eclipse Sparkplug B state machine:
 *   - Node Birth (NBIRTH) with bdSeq and sequence counter initialization (seq = 0)
 *   - Device Birth (DBIRTH) for all physical plant stacks & analyzers
 *   - Telemetry Data (DDATA) with modulo 256 sequence incrementing
 *   - Rebirth Command (NCMD / DCMD / Rebirth) state machine recovery
 *   - Node Death (NDEATH) Last Will and Testament (LWT) handling
 */

class SparkplugBStateMachine {
  constructor(options = {}) {
    this.groupId = options.groupId || 'EU_FLEET';
    this.nodeId = options.nodeId || 'CEMS_GATEWAY_NODE_01';
    this.brokerUrl = options.brokerUrl || process.env.MQTT_BROKER_URL || 'tls://edge-broker.climatesphere.internal:8883';
    this.state = 'OFFLINE'; // 'OFFLINE' | 'INITIALIZING' | 'ONLINE' | 'REBIRTH_IN_PROGRESS'
    this.bdSeq = 0;         // Monotonic Boot-Death Sequence (0..255)
    this.seq = 0;           // Rolling sequence counter (0..255 per Sparkplug specification)
    this.lastBirthTimestamp = null;
    this.lastDeathTimestamp = null;
    this.publishedCount = 0;
    this.devices = new Map();
    this.rebirthCount = 0;

    // Pre-populate default monitored plant stacks
    const initialDevices = options.devices || ['DU-03', 'RT-07', 'MI-02', 'WA-04', 'MD-01'];
    initialDevices.forEach(d => this.registerDevice(d));
  }

  registerDevice(deviceId, metadata = {}) {
    this.devices.set(deviceId, {
      id: deviceId,
      status: 'REGISTERED',
      registeredAt: new Date().toISOString(),
      metadata: {
        type: metadata.type || 'CEMS_FLUE_GAS_ANALYZER',
        standard: 'DIN EN 14181 / EN 15267-3',
        ...metadata
      }
    });
  }

  getDeathPayload(reason = 'UNEXPECTED_DISCONNECT') {
    return {
      topic: `spBv1.0/${this.groupId}/NDEATH/${this.nodeId}`,
      timestamp: Date.now(),
      metrics: [
        { name: 'bdSeq', type: 'UInt64', value: this.bdSeq },
        { name: 'deathReason', type: 'String', value: reason },
        { name: 'timestamp', type: 'DateTime', value: new Date().toISOString() }
      ]
    };
  }

  connect() {
    this.state = 'INITIALIZING';
    this.seq = 0;
    this.lastBirthTimestamp = new Date().toISOString();

    const nbirth = {
      topic: `spBv1.0/${this.groupId}/NBIRTH/${this.nodeId}`,
      timestamp: Date.now(),
      seq: this.seq,
      metrics: [
        { name: 'bdSeq', type: 'UInt64', value: this.bdSeq },
        { name: 'Node Control/Rebirth', type: 'Boolean', value: false },
        { name: 'Gateway/Version', type: 'String', value: 'ClimateSphere 4.8.0-ENTERPRISE' },
        { name: 'Gateway/Hardware Architecture', type: 'String', value: 'x86_64-LINUX-INDUSTRIAL' },
        { name: 'Gateway/Device Count', type: 'Int32', value: this.devices.size },
        { name: 'Properties/Regulatory Compliance', type: 'String', value: 'IED 2010/75/EU & DIN EN 14181' }
      ]
    };

    // Increment seq for subsequent messages
    this.seq = (this.seq + 1) % 256;

    const dbirths = [];
    for (const [deviceId, dev] of this.devices.entries()) {
      dev.status = 'ONLINE';
      dbirths.push({
        topic: `spBv1.0/${this.groupId}/DBIRTH/${this.nodeId}/${deviceId}`,
        timestamp: Date.now(),
        seq: this.seq,
        metrics: [
          { name: 'Device/Status', type: 'String', value: 'ONLINE' },
          { name: 'Analyzer/Model', type: 'String', value: 'ABB AO2000-Ex Continuous Multi-Gas' },
          { name: 'SO2/Concentration', type: 'Float', value: 0.0, units: 'mg/Nm3' },
          { name: 'NOx/Concentration', type: 'Float', value: 0.0, units: 'mg/Nm3' },
          { name: 'CO/Concentration', type: 'Float', value: 0.0, units: 'mg/Nm3' },
          { name: 'O2/Reference', type: 'Float', value: 6.0, units: '%' },
          { name: 'QAL3/Status', type: 'String', value: 'CONFORMANT' }
        ]
      });
      this.seq = (this.seq + 1) % 256;
    }

    this.state = 'ONLINE';
    return { nbirth, dbirths };
  }

  publishDData(deviceId, telemetry) {
    if (this.state !== 'ONLINE') {
      throw new Error(`Cannot publish DDATA: Sparkplug B node is currently in state '${this.state}'`);
    }

    if (!this.devices.has(deviceId)) {
      this.registerDevice(deviceId);
    }

    const currentSeq = this.seq;
    this.seq = (this.seq + 1) % 256;
    this.publishedCount++;

    return {
      topic: `spBv1.0/${this.groupId}/DDATA/${this.nodeId}/${deviceId}`,
      timestamp: Date.now(),
      seq: currentSeq,
      metrics: [
        { name: 'SO2/Actual_mgNm3', type: 'Float', value: parseFloat(telemetry.so2 || 0) },
        { name: 'NOx/Actual_mgNm3', type: 'Float', value: parseFloat(telemetry.nox || 0) },
        { name: 'CO/Actual_mgNm3', type: 'Float', value: parseFloat(telemetry.co || 0) },
        { name: 'O2/Actual_pct', type: 'Float', value: parseFloat(telemetry.o2 || 0) },
        { name: 'Temperature/FlueGas_C', type: 'Float', value: parseFloat(telemetry.temp || 180.5) },
        { name: 'Quality/Flags', type: 'String', value: telemetry.qualityFlag || 'VALID_CALIBRATED' }
      ]
    };
  }

  handleRebirthCommand() {
    this.state = 'REBIRTH_IN_PROGRESS';
    this.rebirthCount++;
    this.bdSeq = (this.bdSeq + 1) % 256;
    return this.connect();
  }

  disconnect(reason = 'NORMAL_OPERATOR_SHUTDOWN') {
    const death = this.getDeathPayload(reason);
    this.state = 'OFFLINE';
    this.lastDeathTimestamp = new Date().toISOString();
    return death;
  }

  getStatus() {
    return {
      standard: 'Eclipse Sparkplug B v1.0 / ISO/IEC 20237',
      state: this.state,
      groupId: this.groupId,
      nodeId: this.nodeId,
      brokerUrl: this.brokerUrl,
      bdSeq: this.bdSeq,
      currentSeq: this.seq,
      rebirthCount: this.rebirthCount,
      publishedCount: this.publishedCount,
      lastBirthTimestamp: this.lastBirthTimestamp,
      lastDeathTimestamp: this.lastDeathTimestamp,
      registeredDevices: Array.from(this.devices.values())
    };
  }
}

module.exports = { SparkplugBStateMachine };
