import type { Context } from 'hono';
import type { Env } from '../types';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
  baggage?: string;
}

function randomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

function parseTraceparent(header: string): {
  traceId?: string;
  spanId?: string;
  sampled?: boolean;
} {
  // Format: version-traceId-spanId-flags
  const parts = header.trim().split('-');
  if (parts.length !== 4) return {};

  const [version, traceId, spanId, flags] = parts;
  if (version !== '00') return {};

  return {
    traceId,
    spanId,
    sampled: flags.endsWith('1'),
  };
}

export function buildTraceparent(context: TraceContext): string {
  const flags = context.sampled ? '01' : '00';
  return `00-${context.traceId}-${context.spanId}-${flags}`;
}

export function createTraceContext(
  c: Context<{ Bindings: Env }>
): TraceContext {
  const incoming = c.req.header('traceparent');
  const parsed = incoming ? parseTraceparent(incoming) : {};

  const traceId = parsed.traceId && parsed.traceId.length === 32
    ? parsed.traceId
    : randomHex(16);

  const parentSpanId =
    parsed.spanId && parsed.spanId.length === 16 ? parsed.spanId : undefined;

  const sampleRate = Number(c.env.TRACE_SAMPLE_RATE ?? 0.05);
  const envDisabled = c.env.TRACE_ENABLED === false;

  const shouldSample = envDisabled
    ? false
    : parsed.sampled !== undefined
      ? parsed.sampled
      : Math.random() < sampleRate;

  const spanId = randomHex(8);

  return {
    traceId,
    spanId,
    parentSpanId,
    sampled: shouldSample,
    baggage: c.req.header('baggage') || undefined,
  };
}

type OtlpAnyValue =
  | { stringValue: string }
  | { boolValue: boolean }
  | { intValue: number }
  | { doubleValue: number };

function toAnyValue(value: any): OtlpAnyValue {
  if (typeof value === 'boolean') return { boolValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { intValue: value }
      : { doubleValue: value };
  }
  return { stringValue: String(value) };
}

/**
 * Export a single server span to an OTLP/HTTP endpoint.
 * Best-effort: failures are swallowed to avoid impacting requests.
 */
export async function exportRequestSpan(
  trace: TraceContext,
  params: {
    name: string;
    startTime: number; // ms epoch
    endTime: number; // ms epoch
    attributes?: Record<string, any>;
    statusCode?: number;
  },
  env: Env
): Promise<void> {
  if (!trace.sampled || !env.OTLP_ENDPOINT) return;

  const serviceName = env.OTLP_SERVICE_NAME || 'cloudflare-rag-portfolio';
  const startNanos = BigInt(params.startTime) * 1_000_000n;
  const endNanos = BigInt(params.endTime) * 1_000_000n;

  const attributes = {
    'http.method': params.name.split(' ')[0],
    'http.target': params.name.split(' ').slice(1).join(' '),
    'http.status_code': params.statusCode ?? 0,
    'service.name': serviceName,
    'deployment.environment': env.ENVIRONMENT,
    ...params.attributes,
  };

  const span = {
    traceId: trace.traceId,
    spanId: trace.spanId,
    parentSpanId: trace.parentSpanId,
    name: params.name,
    kind: 1, // SERVER
    startTimeUnixNano: startNanos.toString(),
    endTimeUnixNano: endNanos.toString(),
    attributes: Object.entries(attributes).map(([key, value]) => ({
      key,
      value: toAnyValue(value),
    })),
  };

  const body = {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: serviceName } },
            {
              key: 'deployment.environment',
              value: { stringValue: env.ENVIRONMENT },
            },
          ],
        },
        scopeSpans: [
          {
            scope: { name: 'cf-worker' },
            spans: [span],
          },
        ],
      },
    ],
  };

  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (env.OTLP_AUTH_HEADER && env.OTLP_AUTH_VALUE) {
    headers[env.OTLP_AUTH_HEADER] = env.OTLP_AUTH_VALUE;
  }
  if (trace.baggage) {
    headers['baggage'] = trace.baggage;
  }
  headers['traceparent'] = buildTraceparent(trace);

  try {
    await fetch(env.OTLP_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    // Best-effort: swallow errors to avoid breaking the request path
    console.warn('OTLP export failed', error);
  }
}
