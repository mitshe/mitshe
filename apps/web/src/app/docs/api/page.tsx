"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Loader2,
  Menu,
  Search,
  Home,
  Terminal,
  FileJson,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OpenAPIParameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: {
    type?: string;
    format?: string;
    enum?: string[];
    default?: unknown;
    items?: Record<string, unknown>;
  };
}

interface OpenAPIRequestBody {
  required?: boolean;
  description?: string;
  content?: {
    [key: string]: {
      schema?: Record<string, unknown>;
    };
  };
}

interface OpenAPIResponse {
  description?: string;
  content?: {
    [key: string]: {
      schema?: Record<string, unknown>;
    };
  };
}

interface OpenAPIOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
  security?: Record<string, string[]>[];
}

interface OpenAPIPath {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  delete?: OpenAPIOperation;
}

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description?: string;
    version: string;
  };
  paths: Record<string, OpenAPIPath>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
  tags?: { name: string; description?: string }[];
}

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

const methodColors: Record<HttpMethod, { bg: string; text: string }> = {
  get: { bg: "bg-emerald-500/15", text: "text-emerald-500" },
  post: { bg: "bg-blue-500/15", text: "text-blue-500" },
  put: { bg: "bg-amber-500/15", text: "text-amber-500" },
  patch: { bg: "bg-orange-500/15", text: "text-orange-500" },
  delete: { bg: "bg-red-500/15", text: "text-red-500" },
};

// Tags to hide from documentation (case-insensitive)
const hiddenTags = [
  "health",
  "webhooks",
  "app",
  "githubwebhook",
  "gitlabwebhook",
  "jirawebhook",
  "youtrackwebhook",
];

// Paths to hide
const hiddenPathPatterns = ["/health", "/webhooks"];

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className={cn(
        "p-1.5 rounded hover:bg-white/10 transition-colors",
        className,
      )}
      title="Copy"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-zinc-400" />
      )}
    </button>
  );
}

function WelcomePage({
  spec,
  onSelectEndpoint,
  groupedEndpoints,
  sortedTags,
}: {
  spec: OpenAPISpec;
  onSelectEndpoint: (endpoint: {
    path: string;
    method: HttpMethod;
    operation: OpenAPIOperation;
  }) => void;
  groupedEndpoints: Record<
    string,
    { path: string; method: HttpMethod; operation: OpenAPIOperation }[]
  >;
  sortedTags: string[];
}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const totalEndpoints = sortedTags.reduce(
    (acc, tag) => acc + groupedEndpoints[tag].length,
    0,
  );

  return (
    <div className="max-w-3xl">
      {/* Hero */}
      <div className="space-y-4 mb-10">
        <h1 className="text-4xl font-bold tracking-tight">{spec.info.title}</h1>
        {spec.info.description && (
          <p className="text-lg text-muted-foreground leading-relaxed">
            {spec.info.description}
          </p>
        )}
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full font-medium">
            v{spec.info.version}
          </span>
          <span className="text-muted-foreground">
            {totalEndpoints} endpoints
          </span>
        </div>
      </div>

      {/* Quick Start */}
      <div className="space-y-4 mb-10">
        <h2 className="text-xl font-semibold">Quick Start</h2>
        <p className="text-muted-foreground">
          All API requests require authentication using a Bearer token. Include
          your API key in the Authorization header.
        </p>
        <div className="relative group">
          <pre className="bg-zinc-950 text-zinc-100 rounded-xl p-5 text-sm font-mono overflow-x-auto border border-zinc-800">
            {`curl -X GET "${apiUrl}/api/v1/tasks" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
          </pre>
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton
              text={`curl -X GET "${apiUrl}/api/v1/tasks" -H "Authorization: Bearer YOUR_API_KEY" -H "Content-Type: application/json"`}
            />
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href="/settings/api-keys"
            className="inline-flex items-center px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Get API Key
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            View Docs
          </Link>
        </div>
      </div>

      {/* Base URL */}
      <div className="space-y-3 mb-10">
        <h2 className="text-xl font-semibold">Base URL</h2>
        <div className="relative group">
          <code className="block bg-muted rounded-xl p-4 text-sm font-mono">
            {apiUrl}/api/v1
          </code>
          <div className="absolute top-1/2 -translate-y-1/2 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={`${apiUrl}/api/v1`} />
          </div>
        </div>
      </div>

      {/* Endpoints Overview */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Endpoints</h2>
        <div className="space-y-4">
          {sortedTags.map((tag) => {
            const tagInfo = spec.tags?.find((t) => t.name === tag);
            return (
              <div
                key={tag}
                className="border rounded-xl p-5 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{tag}</h3>
                    {tagInfo?.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {tagInfo.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    {groupedEndpoints[tag].length}
                  </span>
                </div>
                <div className="space-y-1">
                  {groupedEndpoints[tag]
                    .slice(0, 5)
                    .map(({ path, method, operation }) => {
                      const colors = methodColors[method];
                      return (
                        <button
                          key={`${method}-${path}`}
                          onClick={() =>
                            onSelectEndpoint({ path, method, operation })
                          }
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left group"
                        >
                          <span
                            className={cn(
                              "px-2 py-0.5 text-[10px] font-bold uppercase rounded font-mono shrink-0",
                              colors.bg,
                              colors.text,
                            )}
                          >
                            {method}
                          </span>
                          <code className="text-sm font-mono text-muted-foreground group-hover:text-foreground transition-colors truncate">
                            {path}
                          </code>
                          <span className="text-xs text-muted-foreground hidden md:block truncate ml-auto">
                            {operation.summary}
                          </span>
                        </button>
                      );
                    })}
                  {groupedEndpoints[tag].length > 5 && (
                    <button
                      onClick={() => onSelectEndpoint(groupedEndpoints[tag][0])}
                      className="w-full text-xs text-primary hover:underline text-left px-3 py-2"
                    >
                      +{groupedEndpoints[tag].length - 5} more endpoints
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Code block with syntax highlighting and copy button
function CodeBlock({
  code,
  language = "json",
  title,
  icon: Icon,
  className,
}: {
  code: string;
  language?: string;
  title?: string;
  icon?: typeof Terminal;
  className?: string;
}) {
  if (!code) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800 overflow-hidden",
        className,
      )}
    >
      {title && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
          {Icon && <Icon className="w-3.5 h-3.5 text-zinc-500" />}
          <span className="text-xs font-medium text-zinc-400">{title}</span>
          <div className="ml-auto">
            <CopyButton text={code} />
          </div>
        </div>
      )}
      <div className="relative group">
        <pre
          className={cn(
            "bg-zinc-950 text-zinc-100 p-4 text-sm font-mono overflow-x-auto",
            language === "bash" ? "whitespace-pre-wrap" : "",
          )}
        >
          <code>{code}</code>
        </pre>
        {!title && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={code} />
          </div>
        )}
      </div>
    </div>
  );
}

// Schema property display
function SchemaProperty({
  name,
  schema,
  required,
}: {
  name: string;
  schema: Record<string, unknown>;
  required?: boolean;
}) {
  const type = (schema.type as string) || "object";
  const description = schema.description as string;
  const enumVals = schema.enum as string[] | undefined;
  const nullable = schema.nullable as boolean;
  const format = schema.format as string;

  const typeDisplay = format ? `${type} (${format})` : type;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-sm font-mono font-medium">{name}</code>
        <span className="text-xs text-muted-foreground font-mono px-1.5 py-0.5 bg-muted rounded">
          {typeDisplay}
          {nullable && "?"}
        </span>
        {required && (
          <span className="text-[10px] text-red-500 font-medium uppercase">
            required
          </span>
        )}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
      {enumVals && enumVals.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {enumVals.map((val) => (
            <code
              key={val}
              className="text-[10px] px-1.5 py-0.5 bg-muted rounded"
            >
              {val}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

function EndpointDetail({
  path,
  method,
  operation,
  spec,
}: {
  path: string;
  method: HttpMethod;
  operation: OpenAPIOperation;
  spec: OpenAPISpec;
}) {
  const colors = methodColors[method];
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const [activeTab, setActiveTab] = useState<"example" | "schema">("example");

  const resolveRef = useCallback(
    (ref: string): Record<string, unknown> | null => {
      const parts = ref.replace("#/", "").split("/");
      let result: unknown = spec;
      for (const part of parts) {
        result = (result as Record<string, unknown>)?.[part];
      }
      return result as Record<string, unknown> | null;
    },
    [spec],
  );

  // Use useMemo to create stable recursive functions that can reference themselves
  const { getSchemaExample, getSchemaProperties } = useMemo(() => {
    const getSchemaExampleFn = (
      schema: Record<string, unknown> | undefined,
      depth = 0,
    ): unknown => {
      if (!schema || depth > 5) return null;

      if (schema.$ref) {
        const resolved = resolveRef(schema.$ref as string);
        return getSchemaExampleFn(resolved ?? undefined, depth + 1);
      }

      if (schema.example !== undefined) {
        return schema.example;
      }

      if (schema.type === "array") {
        const items = schema.items as Record<string, unknown> | undefined;
        const itemExample = getSchemaExampleFn(items, depth + 1);
        return itemExample ? [itemExample] : [];
      }

      if (schema.type === "object" || schema.properties) {
        const props = schema.properties as
          | Record<string, Record<string, unknown>>
          | undefined;
        if (!props) return {};

        const example: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(props)) {
          if (value.example !== undefined) {
            example[key] = value.example;
          } else if (value.$ref) {
            example[key] = getSchemaExampleFn(value, depth + 1);
          } else if (value.type === "string") {
            const format = value.format as string;
            const enumVals = value.enum as string[] | undefined;
            if (enumVals?.length) {
              example[key] = enumVals[0];
            } else if (format === "date-time") {
              example[key] = new Date().toISOString();
            } else if (format === "uri") {
              example[key] = "https://example.com";
            } else {
              example[key] = "string";
            }
          } else if (value.type === "number" || value.type === "integer") {
            example[key] = 0;
          } else if (value.type === "boolean") {
            example[key] = true;
          } else if (value.type === "array") {
            example[key] = getSchemaExampleFn(value, depth + 1);
          } else if (value.type === "object" || value.properties) {
            example[key] = getSchemaExampleFn(value, depth + 1);
          }
        }
        return example;
      }

      return null;
    };

    const getSchemaPropertiesFn = (
      schema: Record<string, unknown> | undefined,
    ): {
      properties: Record<string, Record<string, unknown>>;
      required: string[];
    } => {
      if (!schema) return { properties: {}, required: [] };

      if (schema.$ref) {
        const resolved = resolveRef(schema.$ref as string);
        return getSchemaPropertiesFn(resolved ?? undefined);
      }

      return {
        properties:
          (schema.properties as Record<string, Record<string, unknown>>) || {},
        required: (schema.required as string[]) || [],
      };
    };

    return {
      getSchemaExample: getSchemaExampleFn,
      getSchemaProperties: getSchemaPropertiesFn,
    };
  }, [resolveRef]);

  const formatJson = (obj: unknown): string => {
    if (obj === null || obj === undefined) return "";
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return "";
    }
  };

  const requestBodySchema = operation.requestBody?.content?.["application/json"]
    ?.schema as Record<string, unknown> | undefined;
  const responseSchema = (operation.responses?.["200"]?.content?.[
    "application/json"
  ]?.schema ||
    operation.responses?.["201"]?.content?.["application/json"]?.schema) as
    | Record<string, unknown>
    | undefined;

  const requestExample = getSchemaExample(requestBodySchema);
  const responseExample = getSchemaExample(responseSchema);

  const requestJson = formatJson(requestExample);
  const responseJson = formatJson(responseExample);

  const requestSchemaInfo = getSchemaProperties(requestBodySchema);
  const responseSchemaInfo = getSchemaProperties(responseSchema);

  const curlExample = `curl -X ${method.toUpperCase()} "${apiUrl}${path}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"${
    requestJson
      ? ` \\
  -d '${requestJson.replace(/\n/g, "")}'`
      : ""
  }`;

  const successStatus = operation.responses?.["201"] ? "201" : "200";
  const successDescription =
    operation.responses?.[successStatus]?.description || "Success";

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={cn(
              "px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-lg",
              colors.bg,
              colors.text,
            )}
          >
            {method}
          </span>
          <code className="text-base font-mono text-muted-foreground break-all">
            {path}
          </code>
        </div>
        {operation.summary && (
          <h1 className="text-3xl font-bold tracking-tight">
            {operation.summary}
          </h1>
        )}
        {operation.description && (
          <p className="text-muted-foreground text-lg leading-relaxed">
            {operation.description}
          </p>
        )}
      </div>

      {/* Parameters */}
      {operation.parameters && operation.parameters.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Parameters</h2>
          <div className="border rounded-xl divide-y">
            {operation.parameters.map((param) => (
              <div key={param.name} className="px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-sm font-mono font-medium">
                    {param.name}
                  </code>
                  <span className="text-xs text-muted-foreground font-mono px-1.5 py-0.5 bg-muted rounded">
                    {param.schema?.type || "string"}
                  </span>
                  <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted/50 rounded">
                    {param.in}
                  </span>
                  {param.required && (
                    <span className="text-[10px] text-red-500 font-medium uppercase">
                      required
                    </span>
                  )}
                </div>
                {param.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {param.description}
                  </p>
                )}
                {param.schema?.enum && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(param.schema.enum as string[]).map((val) => (
                      <code
                        key={val}
                        className="text-[10px] px-1.5 py-0.5 bg-muted rounded"
                      >
                        {val}
                      </code>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-column layout for request/response on desktop */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left column: Request */}
        <div className="space-y-8">
          {/* Request Body */}
          {requestBodySchema && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Request Body</h2>
                <div className="flex bg-muted rounded-lg p-0.5">
                  <button
                    onClick={() => setActiveTab("example")}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                      activeTab === "example"
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Example
                  </button>
                  <button
                    onClick={() => setActiveTab("schema")}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                      activeTab === "schema"
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Schema
                  </button>
                </div>
              </div>

              {activeTab === "example" ? (
                <CodeBlock
                  code={requestJson || "{}"}
                  title="application/json"
                  icon={FileJson}
                />
              ) : (
                <div className="border rounded-xl divide-y">
                  {Object.entries(requestSchemaInfo.properties).map(
                    ([name, schema]) => (
                      <SchemaProperty
                        key={name}
                        name={name}
                        schema={schema}
                        required={requestSchemaInfo.required.includes(name)}
                      />
                    ),
                  )}
                  {Object.keys(requestSchemaInfo.properties).length === 0 && (
                    <div className="p-4 text-sm text-muted-foreground">
                      No properties defined
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* cURL Example */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Example Request</h2>
            <CodeBlock
              code={curlExample}
              language="bash"
              title="cURL"
              icon={Terminal}
            />
          </div>
        </div>

        {/* Right column: Response */}
        <div className="space-y-8">
          {/* Response */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Response</h2>
              <span className="text-xs px-2 py-0.5 bg-emerald-500/15 text-emerald-500 rounded font-medium">
                {successStatus}
              </span>
              <span className="text-xs text-muted-foreground">
                {successDescription}
              </span>
            </div>

            {responseSchema ? (
              <>
                {activeTab === "example" ? (
                  <CodeBlock
                    code={responseJson || "{}"}
                    title="application/json"
                    icon={FileJson}
                  />
                ) : (
                  <div className="border rounded-xl divide-y">
                    {Object.entries(responseSchemaInfo.properties).map(
                      ([name, schema]) => (
                        <SchemaProperty
                          key={name}
                          name={name}
                          schema={schema}
                          required={responseSchemaInfo.required.includes(name)}
                        />
                      ),
                    )}
                    {Object.keys(responseSchemaInfo.properties).length ===
                      0 && (
                      <div className="p-4 text-sm text-muted-foreground">
                        No properties defined
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="border rounded-xl p-4 text-sm text-muted-foreground">
                No response body
              </div>
            )}
          </div>

          {/* Error Responses */}
          {operation.responses &&
            Object.keys(operation.responses).some(
              (status) => status !== "200" && status !== "201",
            ) && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Error Responses</h2>
                <div className="border rounded-xl divide-y">
                  {Object.entries(operation.responses)
                    .filter(([status]) => status !== "200" && status !== "201")
                    .map(([status, response]) => (
                      <div
                        key={status}
                        className="px-4 py-2.5 flex items-center gap-3"
                      >
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded font-medium",
                            status.startsWith("4")
                              ? "bg-amber-500/15 text-amber-500"
                              : "bg-red-500/15 text-red-500",
                          )}
                        >
                          {status}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {response.description}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<{
    path: string;
    method: HttpMethod;
    operation: OpenAPIOperation;
  } | null>(null);
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showWelcome, setShowWelcome] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  useEffect(() => {
    fetch(`${apiUrl}/api-json`)
      .then((res) => res.json())
      .then((data) => {
        setSpec(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [apiUrl]);

  // Group endpoints by tag
  const groupedEndpoints = useMemo(() => {
    if (!spec) return {};

    return Object.entries(spec.paths).reduce(
      (acc, [path, methods]) => {
        // Skip hidden paths
        if (hiddenPathPatterns.some((pattern) => path.includes(pattern))) {
          return acc;
        }

        const httpMethods: HttpMethod[] = [
          "get",
          "post",
          "put",
          "patch",
          "delete",
        ];

        for (const method of httpMethods) {
          const operation = methods[method];
          if (!operation) continue;

          const tags = operation.tags || ["Other"];

          // Skip if all tags are hidden
          if (tags.every((t) => hiddenTags.includes(t.toLowerCase()))) {
            continue;
          }

          const tag =
            tags.find((t) => !hiddenTags.includes(t.toLowerCase())) || "Other";

          if (!acc[tag]) {
            acc[tag] = [];
          }
          acc[tag].push({ path, method, operation });
        }

        return acc;
      },
      {} as Record<
        string,
        { path: string; method: HttpMethod; operation: OpenAPIOperation }[]
      >,
    );
  }, [spec]);

  // Sort tags
  const sortedTags = useMemo(() => {
    const tagOrder = [
      "Tasks",
      "Projects",
      "Workflows",
      "Executions",
      "Integrations",
      "Repositories",
      "AI Credentials",
      "API Keys",
      "Import",
    ];
    return Object.keys(groupedEndpoints).sort((a, b) => {
      const aIndex = tagOrder.indexOf(a);
      const bIndex = tagOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [groupedEndpoints]);

  // Filter endpoints based on search
  const filteredEndpoints = useMemo(() => {
    if (!searchQuery.trim()) return groupedEndpoints;

    const query = searchQuery.toLowerCase();
    const filtered: typeof groupedEndpoints = {};

    for (const [tag, endpoints] of Object.entries(groupedEndpoints)) {
      const matchingEndpoints = endpoints.filter(
        ({ path, method, operation }) =>
          path.toLowerCase().includes(query) ||
          method.toLowerCase().includes(query) ||
          operation.summary?.toLowerCase().includes(query) ||
          operation.description?.toLowerCase().includes(query),
      );

      if (matchingEndpoints.length > 0) {
        filtered[tag] = matchingEndpoints;
      }
    }

    return filtered;
  }, [groupedEndpoints, searchQuery]);

  const filteredTags = useMemo(() => {
    return sortedTags.filter((tag) => filteredEndpoints[tag]?.length > 0);
  }, [sortedTags, filteredEndpoints]);

  // Tags start collapsed - no initialization needed

  const toggleTag = (tag: string) => {
    const newExpanded = new Set(expandedTags);
    if (newExpanded.has(tag)) {
      newExpanded.delete(tag);
    } else {
      newExpanded.add(tag);
    }
    setExpandedTags(newExpanded);
  };

  const selectEndpoint = (endpoint: {
    path: string;
    method: HttpMethod;
    operation: OpenAPIOperation;
  }) => {
    setSelectedEndpoint(endpoint);
    setShowWelcome(false);
    setSidebarOpen(false);
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goHome = () => {
    setShowWelcome(true);
    setSelectedEndpoint(null);
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-medium">
            Failed to load API documentation
          </p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!spec) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "w-64 border-r bg-background flex-shrink-0 flex flex-col h-screen overflow-hidden",
          "fixed inset-y-0 left-0 top-0 z-40 lg:sticky lg:top-0",
          "transform transition-transform duration-200 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Header */}
        <div className="p-5 border-b">
          <Link href="/docs" className="flex items-center gap-2">
            <span className="font-semibold">mitshe</span>
            <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              API
            </span>
          </Link>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 hover:bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          {/* Home button */}
          <button
            onClick={goHome}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors mb-4",
              showWelcome
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            <Home className="w-4 h-4" />
            Introduction
          </button>

          <div className="space-y-4">
            {filteredTags.map((tag) => (
              <div key={tag}>
                <button
                  onClick={() => toggleTag(tag)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  {expandedTags.has(tag) ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  {tag}
                  <span className="ml-auto text-[10px] font-normal">
                    {filteredEndpoints[tag].length}
                  </span>
                </button>
                {expandedTags.has(tag) && (
                  <div className="mt-1 space-y-0.5">
                    {filteredEndpoints[tag].map(
                      ({ path, method, operation }) => {
                        const isSelected =
                          selectedEndpoint?.path === path &&
                          selectedEndpoint?.method === method &&
                          !showWelcome;
                        const colors = methodColors[method];
                        return (
                          <button
                            key={`${method}-${path}`}
                            onClick={() =>
                              selectEndpoint({ path, method, operation })
                            }
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors text-left",
                              isSelected
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted",
                            )}
                          >
                            <span
                              className={cn(
                                "px-1.5 py-0.5 text-[9px] font-bold uppercase rounded font-mono shrink-0",
                                colors.bg,
                                colors.text,
                              )}
                            >
                              {method}
                            </span>
                            <span className="truncate">
                              {operation.summary ||
                                path.split("/").pop() ||
                                path}
                            </span>
                          </button>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredTags.length === 0 && searchQuery && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No endpoints found for &quot;{searchQuery}&quot;
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t space-y-3">
          <Link
            href="/settings/api-keys"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Get API Key
          </Link>
          <Link
            href="/docs"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Docs
          </Link>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main ref={contentRef} className="flex-1 overflow-y-auto">
        {/* Mobile menu button */}
        <div className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-4 py-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-4 h-4" />
            <span>Menu</span>
          </button>
        </div>

        <div className={cn("mx-auto px-6 lg:px-12 py-8")}>
          {showWelcome ? (
            <WelcomePage
              spec={spec}
              onSelectEndpoint={selectEndpoint}
              groupedEndpoints={groupedEndpoints}
              sortedTags={sortedTags}
            />
          ) : selectedEndpoint ? (
            <EndpointDetail
              path={selectedEndpoint.path}
              method={selectedEndpoint.method}
              operation={selectedEndpoint.operation}
              spec={spec}
            />
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              Select an endpoint from the sidebar
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
