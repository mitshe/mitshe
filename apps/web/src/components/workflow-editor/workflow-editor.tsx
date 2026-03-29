"use client";

import {
  useCallback,
  useState,
  useMemo,
  useRef,
  useEffect,
  DragEvent,
} from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  ReactFlowProvider,
  useReactFlow,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Save,
  Play,
  Maximize2,
  Blocks,
  Code,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import yaml from "js-yaml";

import { BaseNode } from "./nodes/base-node";
import { NodePalette } from "./node-palette";
import { NodeConfigPanel } from "./node-config-panel";
import {
  WorkflowNodeData,
  WorkflowDefinition,
  NODE_DEFINITIONS,
  NodeType,
} from "./types";

const nodeTypes = {
  workflowNode: BaseNode,
};

interface WorkflowEditorProps {
  workflowId?: string;
  initialDefinition?: WorkflowDefinition;
  onSave?: (definition: WorkflowDefinition) => void;
  onRun?: () => void;
}

type EditorMode = "visual" | "code";
type CodeFormat = "yaml" | "json";

function WorkflowEditorInner({
  workflowId: _,
  initialDefinition,
  onSave,
  onRun,
}: WorkflowEditorProps) {
  void _;
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const [editorMode, setEditorMode] = useState<EditorMode>("visual");
  const [codeFormat, setCodeFormat] = useState<CodeFormat>("yaml");
  const [codeContent, setCodeContent] = useState<string>("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const initialNodes = useMemo(() => {
    if (!initialDefinition) return [];
    return initialDefinition.nodes.map((node) => ({
      id: node.id,
      type: "workflowNode",
      position: node.position,
      data: {
        label: node.name,
        nodeType: node.type,
        config: node.config,
      } as WorkflowNodeData,
    }));
  }, [initialDefinition]);

  const initialEdges = useMemo(() => {
    if (!initialDefinition) return [];
    return initialDefinition.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.condition,
      animated: false,
      style: { strokeWidth: 2 },
    }));
  }, [initialDefinition]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.id === selectedNodeId) as
      | Node<WorkflowNodeData>
      | undefined;
  }, [nodes, selectedNodeId]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: false,
            style: { strokeWidth: 2 },
          },
          eds,
        ),
      );
      setIsDirty(true);
    },
    [setEdges],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const onDragStart = useCallback((event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData(
        "application/reactflow",
      ) as NodeType;
      if (!nodeType) return;

      const nodeDef = NODE_DEFINITIONS.find((n) => n.type === nodeType);
      if (!nodeDef) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `node_${Date.now()}`,
        type: "workflowNode" as const,
        position,
        data: {
          label: nodeDef.label,
          nodeType: nodeType,
          config: { ...nodeDef.defaultConfig },
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(newNode.id);
      setIsDirty(true);
    },
    [screenToFlowPosition, setNodes],
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<WorkflowNodeData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, ...data },
            };
          }
          return node;
        }),
      );
      setIsDirty(true);
    },
    [setNodes],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      );
      setIsDirty(true);
    },
    [setNodes, setEdges],
  );

  const toWorkflowDefinition = useCallback((): WorkflowDefinition => {
    return {
      version: "1.0",
      nodes: nodes.map((node) => ({
        id: node.id,
        type: (node.data as WorkflowNodeData).nodeType,
        name: (node.data as WorkflowNodeData).label,
        position: node.position,
        config: (node.data as WorkflowNodeData).config,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        condition: edge.label as string | undefined,
      })),
      variables: initialDefinition?.variables || {},
    };
  }, [nodes, edges, initialDefinition?.variables]);

  const definitionToCode = useCallback(
    (format: CodeFormat): string => {
      const definition = toWorkflowDefinition();
      if (format === "json") {
        return JSON.stringify(definition, null, 2);
      }
      return yaml.dump(definition, { indent: 2, lineWidth: 120 });
    },
    [toWorkflowDefinition],
  );

  const parseCodeToDefinition = useCallback(
    (code: string, format: CodeFormat): WorkflowDefinition | null => {
      try {
        let parsed: unknown;
        if (format === "json") {
          parsed = JSON.parse(code);
        } else {
          parsed = yaml.load(code);
        }

        const def = parsed as WorkflowDefinition;
        if (
          !def.version ||
          !Array.isArray(def.nodes) ||
          !Array.isArray(def.edges)
        ) {
          throw new Error(
            "Invalid workflow structure: missing version, nodes, or edges",
          );
        }

        setCodeError(null);
        return def;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid syntax";
        setCodeError(message);
        return null;
      }
    },
    [],
  );

  const applyCodeToVisual = useCallback((): boolean => {
    const definition = parseCodeToDefinition(codeContent, codeFormat);
    if (!definition) {
      toast.error("Cannot save: invalid workflow definition");
      return false;
    }

    const newNodes = definition.nodes.map((node) => ({
      id: node.id,
      type: "workflowNode" as const,
      position: node.position,
      data: {
        label: node.name,
        nodeType: node.type,
        config: node.config,
      } as WorkflowNodeData,
    }));

    const newEdges = definition.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.condition,
      animated: false,
      style: { strokeWidth: 2 },
    }));

    setNodes(newNodes);
    setEdges(newEdges);
    setIsDirty(true);
    return true;
  }, [codeContent, codeFormat, parseCodeToDefinition, setNodes, setEdges]);

  const handleSave = useCallback(() => {
    if (editorMode === "code") {
      if (!applyCodeToVisual()) {
        return;
      }
    }
    const definition = toWorkflowDefinition();
    onSave?.(definition);
    setIsDirty(false);
  }, [toWorkflowDefinition, onSave, editorMode, applyCodeToVisual]);

  const handleModeChange = useCallback(
    (mode: EditorMode) => {
      if (mode === "code" && editorMode === "visual") {
        setCodeContent(definitionToCode(codeFormat));
        setCodeError(null);
      } else if (mode === "visual" && editorMode === "code") {
        if (codeContent && !applyCodeToVisual()) {
          toast.error("Fix syntax errors before switching to visual mode");
          return;
        }
      }
      setEditorMode(mode);
    },
    [editorMode, codeFormat, definitionToCode, codeContent, applyCodeToVisual],
  );

  const handleFormatChange = useCallback(
    (format: CodeFormat) => {
      const definition = parseCodeToDefinition(codeContent, codeFormat);
      if (definition) {
        setCodeFormat(format);
        if (format === "json") {
          setCodeContent(JSON.stringify(definition, null, 2));
        } else {
          setCodeContent(yaml.dump(definition, { indent: 2, lineWidth: 120 }));
        }
      } else {
        setCodeFormat(format);
      }
    },
    [codeContent, codeFormat, parseCodeToDefinition],
  );

  const handleCodeChange = useCallback(
    (value: string) => {
      setCodeContent(value);
      setIsDirty(true);
      parseCodeToDefinition(value, codeFormat);
    },
    [codeFormat, parseCodeToDefinition],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }, [codeContent]);

  useEffect(() => {
    if (editorMode === "visual" && isDirty) {
    }
  }, [nodes, edges, editorMode, isDirty]);

  return (
    <div className="flex h-full overflow-hidden">
      {editorMode === "visual" && (
        <div className="w-64 shrink-0 h-full">
          <NodePalette onDragStart={onDragStart} />
        </div>
      )}

      <div
        ref={reactFlowWrapper}
        className="flex-1 relative h-full"
        onDragOver={editorMode === "visual" ? onDragOver : undefined}
        onDrop={editorMode === "visual" ? onDrop : undefined}
      >
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <Tabs
            value={editorMode}
            onValueChange={(v) => handleModeChange(v as EditorMode)}
          >
            <TabsList className="bg-card shadow-sm border">
              <TabsTrigger value="visual" className="gap-1.5">
                <Blocks className="w-4 h-4" />
                Visual
              </TabsTrigger>
              <TabsTrigger value="code" className="gap-1.5">
                <Code className="w-4 h-4" />
                Code
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {editorMode === "code" && (
            <Tabs
              value={codeFormat}
              onValueChange={(v) => handleFormatChange(v as CodeFormat)}
            >
              <TabsList className="bg-card shadow-sm border">
                <TabsTrigger value="yaml">YAML</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>

        {editorMode === "code" ? (
          <div className="h-full flex flex-col bg-background">
            {codeError && (
              <Alert variant="destructive" className="m-4 mb-0">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{codeError}</AlertDescription>
              </Alert>
            )}

            <div className="flex-1 p-4 pt-16 relative">
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="bg-card shadow-sm"
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-1.5 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 mr-1.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={!isDirty || !!codeError}
                  className={cn(
                    "bg-card shadow-sm",
                    isDirty &&
                      !codeError &&
                      "border-yellow-500 text-yellow-600 hover:border-yellow-600",
                  )}
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  Save
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={onRun}
                  className="shadow-sm"
                >
                  <Play className="w-4 h-4 mr-1.5" />
                  Run
                </Button>
              </div>

              <textarea
                value={codeContent}
                onChange={(e) => handleCodeChange(e.target.value)}
                className={cn(
                  "w-full h-full font-mono text-sm p-4 rounded-lg border bg-card resize-none focus:outline-none focus:ring-2 focus:ring-ring",
                  codeError && "border-red-500 focus:ring-red-500",
                )}
                placeholder={
                  codeFormat === "yaml"
                    ? "version: '1.0'\nnodes:\n  - id: node_1\n    type: trigger\n    name: Start\n    position:\n      x: 100\n      y: 100\n    config: {}\nedges: []"
                    : '{\n  "version": "1.0",\n  "nodes": [],\n  "edges": []\n}'
                }
                spellCheck={false}
              />
            </div>

            <div className="px-4 py-2 border-t bg-card/80 text-xs text-muted-foreground flex items-center justify-between">
              <span>
                {codeFormat.toUpperCase()} • {codeContent.split("\n").length}{" "}
                lines
              </span>
              <span
                className={cn(codeError ? "text-red-500" : "text-green-500")}
              >
                {codeError ? "Invalid syntax" : "Valid"}
              </span>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[20, 20]}
            defaultEdgeOptions={{
              style: { strokeWidth: 2, stroke: "hsl(var(--muted-foreground))" },
              type: "smoothstep",
            }}
            connectionLineStyle={{
              strokeWidth: 2,
              stroke: "hsl(var(--primary))",
            }}
            className="bg-background"
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1.5}
              color="hsl(var(--muted-foreground) / 0.3)"
            />
            <MiniMap
              nodeColor={(node) => {
                const nodeDef = NODE_DEFINITIONS.find(
                  (n) => n.type === (node.data as WorkflowNodeData)?.nodeType,
                );
                return nodeDef?.color || "#64748b";
              }}
              maskColor="hsl(var(--background) / 0.7)"
              className="!bg-card !border !border-border !rounded-lg !shadow-md"
              pannable
              zoomable
            />
            <Controls
              showInteractive={false}
              className="!bg-card !border !border-border !rounded-lg !shadow-md"
            />

            <Panel position="top-right" className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fitView({ padding: 0.2 })}
                className="bg-card shadow-sm"
              >
                <Maximize2 className="w-4 h-4 mr-1.5" />
                Fit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={!isDirty}
                className={cn(
                  "bg-card shadow-sm",
                  isDirty &&
                    "border-yellow-500 text-yellow-600 hover:border-yellow-600",
                )}
              >
                <Save className="w-4 h-4 mr-1.5" />
                Save
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onRun}
                className="shadow-sm"
              >
                <Play className="w-4 h-4 mr-1.5" />
                Run
              </Button>
            </Panel>

            <Panel
              position="bottom-left"
              className="text-xs text-muted-foreground bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border shadow-sm"
            >
              {nodes.length} nodes • {edges.length} connections
            </Panel>
          </ReactFlow>
        )}
      </div>

      {editorMode === "visual" && selectedNode && (
        <div className="w-80 shrink-0 h-full flex flex-col">
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={updateNodeData}
            onDelete={deleteNode}
            onClose={() => setSelectedNodeId(null)}
          />
        </div>
      )}
    </div>
  );
}

export function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner {...props} />
    </ReactFlowProvider>
  );
}

export default WorkflowEditor;
