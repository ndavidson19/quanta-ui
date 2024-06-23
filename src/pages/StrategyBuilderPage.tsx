import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
  NodeProps,
  EdgeProps,
  useStoreApi,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/Tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/Dialog";
import { Label } from "../components/ui/Label";
import { Textarea } from "../components/ui/TextArea";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock import of quantforge library
import * as quantforge from './mockQuantforge';

const MIN_DISTANCE = 150;

const nodeDefaults = {
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
  style: {
    borderRadius: '8px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    padding: '10px',
    fontSize: '12px',
  },
};

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = () => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button className="edgebutton" onClick={onEdgeClick}>
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};


const strategyComponents = {
  models: ['ARIMA', 'GARCH', 'Neural Network', 'Random Forest'],
  indicators: ['Moving Average', 'RSI', 'MACD', 'Bollinger Bands'],
  signals: ['Price Crossover', 'Volume Spike', 'Momentum', 'Volatility Breakout'],
  actions: ['Buy', 'Sell', 'Hold', 'Adjust Position']
};

const prebuiltStrategies = [
  { name: 'Simple Moving Average Crossover', nodes: [/* ... */], edges: [/* ... */] },
  { name: 'RSI Overbought/Oversold', nodes: [/* ... */], edges: [/* ... */] },
  // Add more pre-built strategies
];

const NodeComponent = ({ id, data }: NodeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { deleteElements } = useReactFlow();

  const handleRemove = () => {
    deleteElements({ nodes: [{ id }] });
  };
  return (
    <div className={`p-2 rounded shadow ${data.bgColor}`}>
      <Handle type="target" position={Position.Left} />
        <strong>{data.type}:</strong> {data.label}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="ml-2" onClick={() => data.onEdit(data.id)}>Edit</Button>
          </DialogTrigger>
        </Dialog>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

const nodeTypes = {
  model: NodeComponent,
  indicator: NodeComponent,
  signal: NodeComponent,
  action: NodeComponent,
};

const StrategyBuilderPage = () => {
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedSourceNode, setSelectedSourceNode] = useState<string | null>(null);
  const [selectedTargetNode, setSelectedTargetNode] = useState<string | null>(null);
  const [strategyName, setStrategyName] = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('models');
  const [codeView, setCodeView] = useState('');
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [backtestResults, setBacktestResults] = useState(null);
  // const store = useStoreApi(); breaking change

  const addToHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), { nodes, edges }]);
    setHistoryIndex(prev => prev + 1);
  }, [nodes, edges, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
        event.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges(eds => {
        const newEdges = addEdge(params, eds);
        addToHistory();
        return newEdges;
      });
    },
    [setEdges, addToHistory]
  );


  const addNode = useCallback(() => {
    if (!selectedComponent || !selectedCategory) {
      console.warn('Cannot add node: selectedComponent or selectedCategory is not set');
      return;
    }
    const newNode: Node = {
      id: `${selectedCategory}-${nodes.length + 1}`,
      type: selectedCategory.slice(0, -1),
      position: { x: Math.random() * 300, y: Math.random() * 300 },
      data: { 
        id: `${selectedCategory}-${nodes.length + 1}`,
        label: selectedComponent,
        type: selectedCategory.slice(0, -1),
        bgColor: getBgColor(selectedCategory),
        onEdit: (id: string) => {
          const nodeToEdit = nodes.find(n => n.id === id);
          console.log('Editing node:', nodeToEdit);
          setEditingNode(nodeToEdit || null);
        },
        parameters: {}
      },
      ...nodeDefaults,
    };
    setNodes(nds => {
      const newNodes = [...nds, newNode];
      addToHistory();
      return newNodes;
    });
  }, [selectedComponent, selectedCategory, nodes, setNodes, addToHistory]);

  const getClosestEdge = useCallback((node: Node) => {
    const { nodeInternals } = store.getState();
    const storeNodes = Array.from(nodeInternals.values());
    const closestNode = storeNodes.reduce(
      (res, n) => {
        if (n.id !== node.id) {
          const dx = n.positionAbsolute.x - node.positionAbsolute.x;
          const dy = n.positionAbsolute.y - node.positionAbsolute.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < res.distance && d < MIN_DISTANCE) {
            res.distance = d;
            res.node = n;
          }
        }
        return res;
      },
      {
        distance: Number.MAX_VALUE,
        node: null,
      }
    );
    if (!closestNode.node) {
      return null;
    }

    const closeNodeIsSource =
      closestNode.node.positionAbsolute.x < node.positionAbsolute.x;

    return {
      id: closeNodeIsSource
        ? `${closestNode.node.id}-${node.id}`
        : `${node.id}-${closestNode.node.id}`,
      source: closeNodeIsSource ? closestNode.node.id : node.id,
      target: closeNodeIsSource ? node.id : closestNode.node.id,
    };
  }, []);

  const onNodeDrag = useCallback(
    (_, node) => {
      const closeEdge = getClosestEdge(node);
      setEdges((es) => {
        const nextEdges = es.filter((e) => e.className !== 'temp');
        if (
          closeEdge &&
          !nextEdges.find(
            (ne) =>
              ne.source === closeEdge.source && ne.target === closeEdge.target
          )
        ) {
          closeEdge.className = 'temp';
          nextEdges.push(closeEdge);
        }
        return nextEdges;
      });
    },
    [getClosestEdge, setEdges]
  );

  const onNodeDragStop = useCallback(
    (_, node) => {
      const closeEdge = getClosestEdge(node);
      setEdges((es) => {
        const nextEdges = es.filter((e) => e.className !== 'temp');
        if (
          closeEdge &&
          !nextEdges.find(
            (ne) =>
              ne.source === closeEdge.source && ne.target === closeEdge.target
          )
        ) {
          nextEdges.push(closeEdge);
        }
        return nextEdges;
      });
    },
    [getClosestEdge, setEdges]
  );

  useEffect(() => {
    console.log('Current nodes:', nodes);
  }, [nodes]);

  const getBgColor = (category: string): string => {
    const colors: {[key: string]: string} = {
      models: 'bg-blue-100',
      indicators: 'bg-green-100',
      signals: 'bg-yellow-100',
      actions: 'bg-red-100'
    };
    return colors[category] || 'bg-gray-100';
  };

  const edgeTypes = {
    custom: CustomEdge,
  };

  const updateNodeParameters = useCallback((id: string, parameters: any) => {
    console.log('Updating node parameters:', id, parameters);
    setNodes(nds => nds.map(node => {
      if (node.id === id) {
        console.log('Found node to update:', node);
        return { ...node, data: { ...node.data, parameters } };
      }
      return node;
    }));
    setEditingNode(null);
  }, [setNodes]);

  const importStrategy = useCallback((strategy: { nodes: Node[], edges: Edge[], name: string }) => {
    setNodes(strategy.nodes);
    setEdges(strategy.edges);
    setStrategyName(strategy.name);
  }, [setNodes, setEdges]);

  const generateCode = useCallback(() => {
    console.log('Generating code for nodes:', nodes);
    const code = nodes.map(node => {
      if (!node || !node.data || !node.data.type || !node.data.label) {
        console.warn('Invalid node data:', node);
        return '';
      }
      return `${node.data.type} = quantforge.${node.data.label}(${JSON.stringify(node.data.parameters)})`;
    }).filter(Boolean).join('\n');
    setCodeView(code);
  }, [nodes]);

  const runBacktest = useCallback(() => {
    const mockResults = Array.from({ length: 100 }, (_, i) => ({
      date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
      value: Math.random() * 100 + 100
    }));
    setBacktestResults(mockResults);
  }, []);

  useEffect(() => {
    console.log('Nodes or edges updated, regenerating code');
    generateCode();
  }, [nodes, edges, generateCode]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Strategy Builder</h1>

      <Tabs defaultValue="graph">
        <TabsList>
          <TabsTrigger value="graph">Graph View</TabsTrigger>
          <TabsTrigger value="code">Code View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="graph">
          <Card>
            <CardHeader>
              <CardTitle>Add Strategy Component</CardTitle>
            </CardHeader>
            <CardContent className="flex space-x-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(strategyComponents).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedComponent} onValueChange={setSelectedComponent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select component" />
                </SelectTrigger>
                <SelectContent>
                  {strategyComponents[selectedCategory]?.map((component) => (
                    <SelectItem key={component} value={component}>
                      {component}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addNode}>Add Node</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Strategy Builder</CardTitle>
            </CardHeader>
            <CardContent style={{ height: '500px' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={(changes) => {
                  onNodesChange(changes);
                  addToHistory();
                }}
                onEdgesChange={(changes) => {
                  onEdgesChange(changes);
                  addToHistory();
                }}
                onConnect={onConnect}
                onNodeDrag={onNodeDrag}
                onNodeDragStop={onNodeDragStop}
                fitView
              >
                <Background />
                <Controls />
                <MiniMap />
              </ReactFlow>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="code">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Code</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={codeView} 
                onChange={(e) => setCodeView(e.target.value)}
                rows={20}
                className="font-mono"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Strategy Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Strategy Name"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
            />
            <Button onClick={() => console.log('Strategy saved:', { name: strategyName, nodes, edges })}>
              Save Strategy
            </Button>
          </div>
          <div className="flex space-x-2">
            <Select onValueChange={(strategy) => importStrategy(JSON.parse(strategy))}>
              <SelectTrigger>
                <SelectValue placeholder="Import pre-built strategy" />
              </SelectTrigger>
              <SelectContent>
                {prebuiltStrategies.map((strategy, index) => (
                  <SelectItem key={index} value={JSON.stringify(strategy)}>
                    {strategy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={runBacktest}>Run Backtest</Button>
          </div>
        </CardContent>
      </Card>

      {backtestResults && (
        <Card>
          <CardHeader>
            <CardTitle>Backtest Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={backtestResults}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Dialog>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Node Parameters</DialogTitle>
          </DialogHeader>
          {editingNode && (
            <div className="space-y-4">
              {Object.entries(editingNode.data.parameters).map(([key, value]) => (
                <div key={key}>
                  <Label>{key}</Label>
                  <Input 
                    value={value as string} 
                    onChange={(e) => {
                      const updatedParams = { ...editingNode.data.parameters, [key]: e.target.value };
                      updateNodeParameters(editingNode.id, updatedParams);
                    }} 
                  />
                </div>
              ))}
              <Button onClick={() => setEditingNode(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StrategyBuilderPage;