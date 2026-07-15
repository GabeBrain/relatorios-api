// OpenAPI 3.0 engine — ported from Testes API/src/api_docs.py

export interface ParameterSpec {
  name: string;
  location: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  schema: SchemaObject;
  description: string;
}

export interface OperationSpec {
  documentId: string;
  documentTitle: string;
  baseUrl: string;
  path: string;
  method: string;
  summary: string;
  operationId: string;
  requiresAuth: boolean;
  queryParams: ParameterSpec[];
  pathParams: ParameterSpec[];
  requestBodySchema: SchemaObject | null;
  get label(): string;
}

export interface OpenAPIDocument {
  documentId: string;
  filename: string;
  title: string;
  version: string;
  baseUrl: string;
  securitySchemes: string[];
  pathCount: number;
  operationCount: number;
  operations: OperationSpec[];
}

export interface RequestResult {
  ok: boolean;
  error: string | null;
  method: string;
  url: string;
  statusCode: number | null;
  latencyMs: number | null;
  responseBytes: number;
  contentType: string;
  requestHeaders: Record<string, string>;
  requestQuery: Record<string, unknown>;
  requestBody: unknown;
  responseJson: unknown;
  responseText: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;
export type SchemaObject = AnyObj;

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'api-doc';
}

function pickSchemaType(schema: SchemaObject): string | null {
  const value = schema.type;
  if (Array.isArray(value)) {
    for (const item of value) if (item !== 'null') return String(item);
    return value[0] ? String(value[0]) : null;
  }
  return typeof value === 'string' ? value : null;
}

function resolveRef(document: AnyObj, ref: string): AnyObj {
  if (!ref.startsWith('#/')) return {};
  let node: unknown = document;
  for (const part of ref.slice(2).split('/')) {
    if (typeof node !== 'object' || node === null) return {};
    node = (node as AnyObj)[part];
    if (node === undefined) return {};
  }
  return typeof node === 'object' && node !== null ? (node as AnyObj) : {};
}

function expandSchema(document: AnyObj, schema: SchemaObject | null | undefined): SchemaObject {
  if (!schema) return {};

  if ('$ref' in schema) {
    const base = resolveRef(document, schema['$ref'] as string);
    const merged: AnyObj = { ...base };
    for (const [k, v] of Object.entries(schema)) {
      if (k !== '$ref') merged[k] = v;
    }
    return expandSchema(document, merged);
  }

  const copy: AnyObj = { ...schema };

  if (typeof copy.properties === 'object' && copy.properties !== null) {
    const expanded: AnyObj = {};
    for (const [k, v] of Object.entries(copy.properties as AnyObj)) {
      expanded[k] = typeof v === 'object' && v !== null ? expandSchema(document, v as AnyObj) : v;
    }
    copy.properties = expanded;
  }

  if (typeof copy.items === 'object' && copy.items !== null) {
    copy.items = expandSchema(document, copy.items as AnyObj);
  }

  return copy;
}

function resolveParameter(document: AnyObj, parameter: AnyObj): AnyObj {
  if (!('$ref' in parameter)) return parameter;
  const resolved = resolveRef(document, parameter['$ref'] as string);
  if (!resolved || Object.keys(resolved).length === 0) return parameter;
  const merged: AnyObj = { ...resolved };
  for (const [k, v] of Object.entries(parameter)) {
    if (k !== '$ref') merged[k] = v;
  }
  return merged;
}

function parseParameter(document: AnyObj, parameter: AnyObj): ParameterSpec | null {
  const resolved = resolveParameter(document, parameter);
  const name = resolved.name;
  const location = resolved.in;
  if (!name || !location) return null;

  const schema = expandSchema(document, resolved.schema ?? {});
  return {
    name: String(name),
    location: String(location) as ParameterSpec['location'],
    required: Boolean(resolved.required ?? false),
    schema,
    description: String(resolved.description ?? ''),
  };
}

function buildSampleFromSchema(schema: SchemaObject, fieldName = ''): unknown {
  const schemaType = pickSchemaType(schema);
  const fieldKey = fieldName.trim().toLowerCase();

  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];

  if (fieldKey === 'poligonos') return [];

  if (schemaType === 'object') {
    const properties: AnyObj = schema.properties ?? {};
    const required: string[] = Array.isArray(schema.required) ? schema.required : [];
    const targetKeys = required.length > 0
      ? required.filter((k) => k in properties)
      : Object.keys(properties).slice(0, 4);

    const sample: AnyObj = {};
    for (const key of targetKeys) {
      const val = properties[key];
      if (typeof val === 'object' && val !== null) {
        sample[key] = buildSampleFromSchema(val as SchemaObject, key);
      }
    }
    return sample;
  }

  if (schemaType === 'array') {
    const items = schema.items;
    const itemValue = typeof items === 'object' && items !== null
      ? buildSampleFromSchema(items as SchemaObject, fieldName)
      : '';
    return [itemValue];
  }

  if (schemaType === 'string') {
    const fmt = schema.format;
    if (fmt === 'email' || fieldKey === 'email') return 'seu_email@empresa.com';
    if (fieldKey === 'password' || fieldKey === 'senha') return 'sua_senha';
    if (fieldKey === 'uf' || fieldKey === 'state') return 'SP';
    if (fieldKey === 'cidade' || fieldKey === 'city') return 'Sao Paulo';
    if (fieldKey.includes('period')) return '2025-01';
    if (fieldKey === 'id' || fieldKey === 'building_id') return '123';
    if ('example' in schema) return schema.example;
    return '';
  }

  if (schemaType === 'integer') return schema.example ?? 1;
  if (schemaType === 'number') return schema.example ?? 1.0;
  if (schemaType === 'boolean') return schema.example ?? true;
  if ('example' in schema) return schema.example;

  return null;
}

export function buildRequestBodyTemplate(operation: OperationSpec): string {
  if (!operation.requestBodySchema) return '';
  const sample = buildSampleFromSchema(operation.requestBodySchema);
  return JSON.stringify(sample, null, 2);
}

function coerceScalar(raw: string, schema: SchemaObject): unknown {
  const t = pickSchemaType(schema);
  if (t === 'integer') return parseInt(raw, 10);
  if (t === 'number') return parseFloat(raw);
  if (t === 'boolean') {
    const lower = raw.trim().toLowerCase();
    if (['true', '1', 'yes', 'sim'].includes(lower)) return true;
    if (['false', '0', 'no', 'nao'].includes(lower)) return false;
    throw new Error('valor booleano inválido; use true/false');
  }
  return raw;
}

export function coerceParameterValue(raw: string, schema: SchemaObject): unknown {
  const t = pickSchemaType(schema);
  const value = raw.trim();

  if (t === 'array') {
    const itemsSchema: SchemaObject = schema.items ?? {};
    if (value.startsWith('[')) {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) throw new Error('valor de array deve ser uma lista JSON');
      return parsed.map((item) => typeof item === 'string' ? coerceScalar(item, itemsSchema) : item);
    }
    const parts = value.split(',').map((p) => p.trim()).filter(Boolean);
    return parts.map((p) => coerceScalar(p, itemsSchema));
  }

  return coerceScalar(value, schema);
}

export function buildRequestUrl(baseUrl: string, path: string, pathValues: Record<string, unknown>): string {
  let resolved = path;
  for (const [key, val] of Object.entries(pathValues)) {
    resolved = resolved.replace(`{${key}}`, encodeURIComponent(String(val)));
  }
  return `${baseUrl.replace(/\/$/, '')}${resolved}`;
}

function prepareParams(params: ParameterSpec[], values: Record<string, string>): Record<string, unknown> {
  const prepared: Record<string, unknown> = {};
  for (const param of params) {
    const rawValue = (values[param.name] ?? '').trim();
    if (!rawValue) {
      if (param.required) throw new Error(`parâmetro obrigatório ausente: ${param.name}`);
      continue;
    }
    prepared[param.name] = coerceParameterValue(rawValue, param.schema);
  }
  return prepared;
}

export function maskHeaders(headers: Record<string, string>): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    safe[k] = k.toLowerCase() === 'authorization' && v ? 'Bearer ***' : v;
  }
  return safe;
}

export interface ExecuteRequestOptions {
  operation: OperationSpec;
  token: string;
  includeAuth: boolean;
  queryInputs: Record<string, string>;
  pathInputs: Record<string, string>;
  rawBody: string;
  timeoutSeconds?: number;
  signal?: AbortSignal;
}

export async function executeRequest(opts: ExecuteRequestOptions): Promise<RequestResult> {
  const { operation, token, includeAuth, queryInputs, pathInputs, rawBody, timeoutSeconds = 40, signal } = opts;

  const pathValues = prepareParams(operation.pathParams, pathInputs);
  const queryValues = prepareParams(operation.queryParams, queryInputs);
  const url = buildRequestUrl(operation.baseUrl, operation.path, pathValues);

  let requestBody: unknown = null;
  if (rawBody.trim() && !['GET', 'HEAD', 'OPTIONS'].includes(operation.method)) {
    requestBody = JSON.parse(rawBody);
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (requestBody !== null) headers['Content-Type'] = 'application/json';
  if (includeAuth && token.trim()) headers['Authorization'] = `Bearer ${token.trim()}`;

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(queryValues)) {
    if (Array.isArray(v)) v.forEach((item) => qs.append(k, String(item)));
    else qs.set(k, String(v));
  }
  const fullUrl = qs.toString() ? `${url}?${qs}` : url;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  const combinedSignal = controller.signal;

  const start = performance.now();

  try {
    const fetchOpts: RequestInit = { method: operation.method, headers, signal: combinedSignal };
    if (requestBody !== null) fetchOpts.body = JSON.stringify(requestBody);

    const response = await fetch(fullUrl, fetchOpts);
    clearTimeout(timer);
    const latencyMs = performance.now() - start;
    const contentType = response.headers.get('Content-Type') ?? '';
    const raw = await response.arrayBuffer();
    const bytes = raw.byteLength;
    const text = new TextDecoder().decode(raw);

    let responseJson: unknown = null;
    let responseText: string | null = null;

    if (contentType.toLowerCase().includes('application/json')) {
      try { responseJson = JSON.parse(text); } catch { responseText = text; }
    } else {
      responseText = text;
    }

    return {
      ok: response.ok,
      error: null,
      method: operation.method,
      url: fullUrl,
      statusCode: response.status,
      latencyMs,
      responseBytes: bytes,
      contentType,
      requestHeaders: maskHeaders(headers),
      requestQuery: queryValues,
      requestBody,
      responseJson,
      responseText,
    };
  } catch (err) {
    clearTimeout(timer);
    const latencyMs = performance.now() - start;
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      method: operation.method,
      url: fullUrl,
      statusCode: null,
      latencyMs,
      responseBytes: 0,
      contentType: '',
      requestHeaders: maskHeaders(headers),
      requestQuery: queryValues,
      requestBody,
      responseJson: null,
      responseText: null,
    };
  }
}

export function loadOpenAPIDocuments(specs: Array<{ filename: string; raw: AnyObj }>): OpenAPIDocument[] {
  const documents: OpenAPIDocument[] = [];

  for (const { filename, raw } of specs) {
    if (typeof raw !== 'object' || !raw || !('paths' in raw)) continue;

    const info = raw.info ?? {};
    const title = String(info.title ?? filename.replace(/\.json$/i, ''));
    const version = String(info.version ?? '-');
    const servers: AnyObj[] = Array.isArray(raw.servers) ? raw.servers : [];
    const baseUrl = servers.length > 0 && typeof servers[0].url === 'string' ? servers[0].url : '';

    const components = raw.components ?? {};
    const securitySchemes: string[] = typeof components.securitySchemes === 'object' && components.securitySchemes !== null
      ? Object.keys(components.securitySchemes as AnyObj)
      : [];

    const globalSecurity = Array.isArray(raw.security) ? raw.security : [];
    const paths: AnyObj = raw.paths ?? {};
    const operations: OperationSpec[] = [];

    for (const [path, pathItem] of Object.entries(paths)) {
      if (typeof pathItem !== 'object' || pathItem === null) continue;

      const pathParameters: AnyObj[] = Array.isArray((pathItem as AnyObj).parameters)
        ? ((pathItem as AnyObj).parameters as AnyObj[])
        : [];

      for (const [method, operation] of Object.entries(pathItem as AnyObj)) {
        if (!HTTP_METHODS.has(method.toLowerCase()) || typeof operation !== 'object' || operation === null) continue;

        const op = operation as AnyObj;
        const rawParams: AnyObj[] = Array.isArray(op.parameters) ? op.parameters : [];
        const allParams = [...pathParameters, ...rawParams];

        const parsedParams: ParameterSpec[] = allParams
          .filter((p): p is AnyObj => typeof p === 'object' && p !== null)
          .map((p) => parseParameter(raw, p))
          .filter((p): p is ParameterSpec => p !== null);

        const queryParams = parsedParams.filter((p) => p.location === 'query');
        const pathParams = parsedParams.filter((p) => p.location === 'path');

        let requestBodySchema: SchemaObject | null = null;
        const requestBody = op.requestBody;
        if (typeof requestBody === 'object' && requestBody !== null) {
          let resolvedBody = requestBody as AnyObj;
          if ('$ref' in resolvedBody) {
            const r = resolveRef(raw, resolvedBody['$ref'] as string);
            if (r && Object.keys(r).length > 0) resolvedBody = r;
          }
          const content: AnyObj = resolvedBody.content ?? {};
          const appJson: AnyObj = content['application/json'] ?? {};
          const schema = appJson.schema;
          if (typeof schema === 'object' && schema !== null) {
            requestBodySchema = expandSchema(raw, schema as SchemaObject);
          }
        }

        const opSecurity = Array.isArray(op.security) ? op.security : globalSecurity;
        let requiresAuth = opSecurity.length > 0;
        if (path === '/auth/login' && method.toLowerCase() === 'post') requiresAuth = false;

        const spec: OperationSpec = {
          documentId: slugify(filename.replace(/\.json$/i, '')),
          documentTitle: title,
          baseUrl,
          path,
          method: method.toUpperCase(),
          summary: String(op.summary ?? ''),
          operationId: String(op.operationId ?? `${method}.${path}`),
          requiresAuth,
          queryParams,
          pathParams,
          requestBodySchema,
          get label() {
            return `${this.method} ${this.path}${this.summary ? ` — ${this.summary}` : ''}`;
          },
        };

        operations.push(spec);
      }
    }

    operations.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

    documents.push({
      documentId: slugify(filename.replace(/\.json$/i, '')),
      filename,
      title,
      version,
      baseUrl,
      securitySchemes,
      pathCount: Object.keys(paths).length,
      operationCount: operations.length,
      operations,
    });
  }

  documents.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
  return documents;
}

// ── Path-id candidate store (in-memory, survives page navigation via module scope) ──

const candidateStore: Record<string, string[]> = {};

export function addCandidates(key: string, value: unknown): void {
  const k = String(key).trim().toLowerCase();
  const v = String(value ?? '').trim();
  if (!k || !v || v.length > 120) return;
  const bucket = candidateStore[k] ?? [];
  if (!bucket.includes(v)) {
    bucket.push(v);
    candidateStore[k] = bucket.slice(0, 200);
  }
}

export function updatePathCandidates(responseJson: unknown, pathInputs: Record<string, string>): void {
  for (const [k, v] of Object.entries(pathInputs)) {
    if (v.trim()) addCandidates(k, v);
  }

  const stack: unknown[] = [responseJson];
  let visited = 0;
  while (stack.length && visited < 2500) {
    const current = stack.pop();
    visited++;
    if (typeof current === 'object' && current !== null && !Array.isArray(current)) {
      for (const [k, v] of Object.entries(current as AnyObj)) {
        const kn = k.toLowerCase();
        if (typeof v === 'object' && v !== null) stack.push(v);
        else if (kn === 'id' || kn.endsWith('_id')) addCandidates(kn, v);
      }
    } else if (Array.isArray(current)) {
      current.slice(0, 400).forEach((item) => stack.push(item));
    }
  }
}

export function getPathParamCandidates(paramName: string, schema: SchemaObject): string[] {
  const candidates = new Set<string>();
  const norm = paramName.trim().toLowerCase();

  if (Array.isArray(schema.enum)) {
    schema.enum.forEach((v) => { if (v !== null) candidates.add(String(v)); });
  }

  (candidateStore[norm] ?? []).forEach((v) => candidates.add(v));

  if (norm === 'id') {
    ['id', 'building_id', 'city_id'].forEach((alias) => {
      (candidateStore[alias] ?? []).forEach((v) => candidates.add(v));
    });
  }

  return [...candidates].filter((v) => v.trim()).sort().slice(0, 200);
}

// ── Date param detection ──

export function isDateQueryParam(paramName: string, schema: SchemaObject): boolean {
  const t = pickSchemaType(schema);
  if (!t?.includes('string')) return false;

  const fmt = String(schema.format ?? '').toLowerCase();
  if (fmt === 'date' || fmt === 'date-time') return true;

  const name = paramName.trim().toLowerCase();
  const directNames = new Set([
    'start_period', 'end_period', 'start_date', 'end_date',
    'date_from', 'date_to', 'last_update_gt', 'last_update_lt',
  ]);
  if (directNames.has(name)) return true;
  if (name.includes('date') || name.includes('period')) return true;
  if ((name.endsWith('_gt') || name.endsWith('_lt')) && /update|date|period/.test(name)) return true;

  return false;
}

export function isArraySchema(schema: SchemaObject): boolean {
  const t = schema.type;
  if (Array.isArray(t)) return t.includes('array');
  return t === 'array';
}

export function getArrayItemEnumValues(schema: SchemaObject): string[] {
  if (!isArraySchema(schema)) return [];
  const items = schema.items;
  if (typeof items !== 'object' || items === null) return [];
  const enums = (items as SchemaObject).enum;
  return Array.isArray(enums) ? enums.filter((v) => v !== null).map(String) : [];
}

export function getEnumValues(schema: SchemaObject): string[] {
  const enums = schema.enum;
  return Array.isArray(enums) ? enums.filter((v) => v !== null).map(String) : [];
}

export function buildCurlCommand(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown,
  token: string,
): string {
  const lines: string[] = [`curl -X ${method} '${url}'`];
  if (token) lines.push(`  -H 'Authorization: Bearer ${token}'`);
  lines.push(`  -H 'Accept: application/json'`);
  if (body !== null && body !== undefined) {
    lines.push(`  -H 'Content-Type: application/json'`);
    lines.push(`  -d '${JSON.stringify(body)}'`);
  }
  return lines.join(' \\\n');
}
