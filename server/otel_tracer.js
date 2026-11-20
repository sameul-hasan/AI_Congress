/**
 * ClimateSphere AI — Enterprise OpenTelemetry (OTel) Distributed Tracing Engine
 * server/otel_tracer.js
 *
 * Implements W3C Trace Context (traceparent / tracestate) standard for distributed tracing
 * across edge gateways, database queries, fieldbus drivers, and enterprise ERP integrations.
 * Spec: https://www.w3.org/TR/trace-context/
 */

const crypto = require('crypto');

class OpenTelemetryTracer {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'climatesphere-edge-gateway';
    this.serviceVersion = options.serviceVersion || '4.8.0-ENTERPRISE';
    this.spans = [];
    this.maxSpans = options.maxSpans || 2000;
  }

  generateTraceId() {
    return crypto.randomBytes(16).toString('hex');
  }

  generateSpanId() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Parses incoming W3C traceparent header:
   * Format: version(2)-traceId(32)-parentSpanId(16)-traceFlags(2)
   */
  parseTraceparent(header) {
    if (!header || typeof header !== 'string') return null;
    const parts = header.trim().split('-');
    if (parts.length < 4) return null;
    const [version, traceId, parentSpanId, traceFlags] = parts;
    if (version !== '00' || traceId.length !== 32 || parentSpanId.length !== 16) return null;
    return { version, traceId, parentSpanId, traceFlags };
  }

  formatTraceparent(traceId, spanId, sampled = true) {
    const flags = sampled ? '01' : '00';
    return `00-${traceId}-${spanId}-${flags}`;
  }

  startSpan(name, options = {}) {
    const incoming = this.parseTraceparent(options.incomingTraceparent);
    const traceId = incoming ? incoming.traceId : (options.traceId || this.generateTraceId());
    const parentSpanId = incoming ? incoming.parentSpanId : (options.parentSpanId || null);
    const spanId = this.generateSpanId();
    const startTime = Date.now();
    const hrStartTime = process.hrtime();

    const span = {
      traceId,
      spanId,
      parentSpanId,
      name,
      serviceName: this.serviceName,
      serviceVersion: this.serviceVersion,
      startTime: new Date(startTime).toISOString(),
      attributes: {
        'service.name': this.serviceName,
        'telemetry.sdk.language': 'nodejs',
        'telemetry.sdk.name': 'opentelemetry-w3c',
        ...options.attributes
      },
      events: [],
      status: { code: 'UNSET' }
    };

    const end = (status = 'OK', error = null) => {
      const diff = process.hrtime(hrStartTime);
      const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
      span.endTime = new Date().toISOString();
      span.durationMs = parseFloat(durationMs);
      span.status = {
        code: status,
        message: error ? (error.message || String(error)) : 'Span completed successfully'
      };

      this.spans.unshift(span);
      if (this.spans.length > this.maxSpans) this.spans.pop();
      return span;
    };

    return {
      traceId,
      spanId,
      traceparent: this.formatTraceparent(traceId, spanId),
      addEvent: (eventName, attrs = {}) => {
        span.events.push({ name: eventName, timestamp: new Date().toISOString(), attributes: attrs });
      },
      setAttribute: (k, v) => {
        span.attributes[k] = v;
      },
      end
    };
  }

  getTrace(traceId) {
    return this.spans.filter(s => s.traceId === traceId);
  }

  getRecentSpans(limit = 50) {
    return this.spans.slice(0, Math.min(limit, this.spans.length));
  }

  getStatus() {
    return {
      standard: 'W3C Trace Context 1.0 (traceparent)',
      serviceName: this.serviceName,
      serviceVersion: this.serviceVersion,
      spansRecorded: this.spans.length,
      recentSpansCount: Math.min(10, this.spans.length),
      sampledRate: '100%',
      otlpCompatible: true
    };
  }

  exportOtlp(limit = 50) {
    const recent = this.getRecentSpans(limit);
    return {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: this.serviceName } },
              { key: 'service.version', value: { stringValue: this.serviceVersion } },
              { key: 'deployment.environment', value: { stringValue: process.env.NODE_ENV || 'production' } }
            ]
          },
          scopeSpans: [
            {
              scope: { name: 'climatesphere.tracer', version: '4.8.0' },
              spans: recent.map(s => ({
                traceId: s.traceId,
                spanId: s.spanId,
                parentSpanId: s.parentSpanId || '',
                name: s.name,
                kind: 1, // SPAN_KIND_INTERNAL
                startTimeUnixNano: String(new Date(s.startTime).getTime() * 1000000),
                endTimeUnixNano: String(new Date(s.endTime || s.startTime).getTime() * 1000000),
                attributes: Object.entries(s.attributes || {}).map(([k, v]) => ({
                  key: k,
                  value: typeof v === 'number' ? { doubleValue: v } : { stringValue: String(v) }
                })),
                status: { code: s.status && s.status.code === 'OK' ? 1 : 2, message: s.status ? s.status.message : '' }
              }))
            }
          ]
        }
      ]
    };
  }
}

module.exports = { OpenTelemetryTracer };
