import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save,
  Download,
  Share2,
  Play,
  Pause,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Eye,
  FolderTree,
  Edit2,
  Link as LinkIcon,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CodeEditor } from '@/components/CodeEditor';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useProjects } from '@/hooks/useProjects';
import { ROUTE_PATHS, ConnectionStatus, formatTimestamp, WS_SERVER_URL } from '@/lib/index';
import { springPresets, fadeInUp } from '@/lib/motion';
import { AI_MODELS, puterService } from '@/lib/puter';
import { toast } from 'sonner';

export default function Editor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get('id');
  const { getProject, updateProject } = useProjects();
  const { status, send, lastMessage } = useWebSocket(WS_SERVER_URL);

  const [code, setCode] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-5.3-chat');
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [workspaceView, setWorkspaceView] = useState(false);
  const [workspaceData, setWorkspaceData] = useState<any>(null);
  const [studioPreview, setStudioPreview] = useState<string | null>(null);
  const [isShareable, setIsShareable] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const project = projectId ? getProject(projectId) : null;

  useEffect(() => {
    if (project) {
      setCode(project.code || '');
      setProjectName(project.name);
    } else {
      setCode(`local Players = game:GetService("Players")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\n\nlocal function onPlayerAdded(player)\n    print("Player joined:", player.Name)\n    \n    local leaderstats = Instance.new("Folder")\n    leaderstats.Name = "leaderstats"\n    leaderstats.Parent = player\n    \n    local coins = Instance.new("IntValue")\n    coins.Name = "Coins"\n    coins.Value = 0\n    coins.Parent = leaderstats\nend\n\nPlayers.PlayerAdded:Connect(onPlayerAdded)\n\nprint("Game initialized successfully!")`);
      setProjectName('Untitled Project');
    }
  }, [project]);

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'workspace_data') {
        setWorkspaceData(lastMessage.payload);
      } else if (lastMessage.type === 'studio_preview') {
        setStudioPreview(lastMessage.payload.screenshot);
      } else if (lastMessage.type === 'code_generated') {
        setCode(lastMessage.payload.code);
        setIsGenerating(false);
        toast.success('Code generated successfully');
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    if (liveMode && status === ConnectionStatus.CONNECTED) {
      const interval = setInterval(() => {
        send({ type: 'request_preview' });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [liveMode, status, send]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleSave = useCallback(async () => {
    if (!projectId) return;

    setIsSaving(true);
    try {
      updateProject(projectId, { code, name: projectName });
      setLastSaved(new Date());

      if (status === ConnectionStatus.CONNECTED) {
        send({
          type: 'save',
          projectId,
          code,
        });
      }
      toast.success('Project saved');
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [projectId, code, projectName, updateProject, status, send]);

  const handleExport = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.lua`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Code exported');
  }, [code, projectName]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Code copied to clipboard');
  }, [code]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
    if (status === ConnectionStatus.CONNECTED) {
      send({
        type: isPlaying ? 'stop' : 'play',
        projectId,
      });
    }
  }, [isPlaying, status, projectId, send]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleModelChange = async (model: string) => {
    const user = await puterService.getUser();
    if (!user) {
      toast.error(
        <div>
          Please <span className="underline cursor-pointer" onClick={() => navigate(ROUTE_PATHS.SETTINGS)}>login to PuterJS through settings</span> to use AI models
        </div>,
        { duration: 5000 }
      );
      return;
    }
    setSelectedModel(model);
    toast.success(`Switched to ${AI_MODELS.find(m => m.id === model)?.name}`);
  };

  const handleGenerateWithAI = async (prompt: string) => {
    const user = await puterService.getUser();
    if (!user) {
      toast.error(
        <div>
          Please <span className="underline cursor-pointer" onClick={() => navigate(ROUTE_PATHS.SETTINGS)}>login to PuterJS through settings</span> to use AI generation
        </div>,
        { duration: 5000 }
      );
      return;
    }

    setIsGenerating(true);
    try {
      const generatedCode = await puterService.generateCode(prompt, selectedModel);
      setCode(generatedCode);
      toast.success('Code generated with AI');
    } catch (error) {
      toast.error('Failed to generate code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRequestWorkspace = useCallback(() => {
    if (status === ConnectionStatus.CONNECTED) {
      send({ type: 'get_workspace', payload: {} });
      setWorkspaceView(true);
      toast.info('Requesting workspace data...');
    } else {
      toast.error('Not connected to Roblox Studio');
    }
  }, [status, send]);

  const handleToggleLive = useCallback(() => {
    if (status !== ConnectionStatus.CONNECTED) {
      toast.error('Connect to Roblox Studio first');
      return;
    }
    setLiveMode(prev => !prev);
    toast.success(liveMode ? 'Live mode disabled' : 'Live mode enabled');
  }, [status, liveMode]);

  const handleShare = useCallback(() => {
    setIsShareable(true);
    const link = `${window.location.origin}${ROUTE_PATHS.EDITOR}?shared=${projectId}`;
    setShareLink(link);
    navigator.clipboard.writeText(link);
    toast.success('Share link copied to clipboard');
  }, [projectId]);

  const handleNameSave = useCallback(() => {
    setIsEditingName(false);
    if (projectId) {
      updateProject(projectId, { name: projectName });
      toast.success('Project name updated');
    }
  }, [projectId, projectName, updateProject]);

  const getStatusColor = () => {
    return status === ConnectionStatus.CONNECTED ? 'text-green-500' : 'text-red-500';
  };

  const getStatusText = () => {
    return status === ConnectionStatus.CONNECTED ? 'Connected' : 'Disconnected';
  };

  return (
    <div className=\"h-screen flex flex-col bg-background\">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springPresets.gentle}
        className=\"border-b border-border bg-card/50 backdrop-blur-sm\"
      >
        <div className=\"flex items-center justify-between px-6 py-3\">
          <div className=\"flex items-center gap-4\">
            <Button
              variant=\"ghost\"
              size=\"sm\"
              onClick={() => navigate(ROUTE_PATHS.DASHBOARD)}
            >
              <ChevronLeft className=\"w-4 h-4 mr-1\" />
              Back
            </Button>
            <Separator orientation=\"vertical\" className=\"h-6\" />
            <div className=\"flex items-center gap-2\">
              {isEditingName ? (
                <Input
                  ref={nameInputRef}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave();
                    if (e.key === 'Escape') {
                      setIsEditingName(false);
                      setProjectName(project?.name || 'Untitled Project');
                    }
                  }}
                  className=\"h-8 w-64\"
                />
              ) : (
                <h1
                  className=\"text-lg font-semibold cursor-pointer hover:text-primary transition-colors\"
                  onClick={() => setIsEditingName(true)}
                  onDoubleClick={() => setIsEditingName(true)}
                >
                  {projectName}
                </h1>
              )}
              <Button
                variant=\"ghost\"
                size=\"sm\"
                onClick={() => setIsEditingName(true)}
              >
                <Edit2 className=\"w-3 h-3\" />
              </Button>
            </div>
            {lastSaved && (
              <p className=\"text-xs text-muted-foreground\">
                Last saved {formatTimestamp(lastSaved)}
              </p>
            )}
          </div>

          <div className=\"flex items-center gap-2\">
            <div className=\"flex items-center gap-2 mr-4\">
              <span className=\"text-sm text-muted-foreground\">Status:</span>
              <span className={`text-sm font-semibold ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
            <div className=\"flex items-center gap-2 mr-4\">
              <span className=\"text-sm text-muted-foreground\">AI Model:</span>
              <Select value={selectedModel} onValueChange={handleModelChange}>
                <SelectTrigger className=\"w-[180px] h-8\">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isPlaying ? 'destructive' : 'default'}
                    size=\"sm\"
                    onClick={handlePlayPause}
                    disabled={status !== ConnectionStatus.CONNECTED}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className=\"w-4 h-4 mr-2\" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className=\"w-4 h-4 mr-2\" />
                        Test
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Test in Roblox Studio</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant=\"outline\"
                    size=\"sm\"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    <Save className=\"w-4 h-4 mr-2\" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save changes (Ctrl+S)</p>
                </TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant=\"outline\" size=\"sm\">
                    <Share2 className=\"w-4 h-4 mr-2\" />
                    Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align=\"end\">
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className=\"w-4 h-4 mr-2\" />
                    Export as .lua
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopy}>
                    {copied ? (
                      <Check className=\"w-4 h-4 mr-2\" />
                    ) : (
                      <Copy className=\"w-4 h-4 mr-2\" />
                    )}
                    {copied ? 'Copied!' : 'Copy to clipboard'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleShare}>
                    <LinkIcon className=\"w-4 h-4 mr-2\" />
                    Create share link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant=\"ghost\" size=\"sm\" onClick={toggleFullscreen}>
                    {isFullscreen ? (
                      <Minimize2 className=\"w-4 h-4\" />
                    ) : (
                      <Maximize2 className=\"w-4 h-4\" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </motion.header>

      <div className=\"flex-1 flex overflow-hidden\">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={springPresets.gentle}
          className={`flex-1 flex flex-col border-r border-border ${
            showPreview ? 'w-1/2' : 'w-full'
          }`}
        >
          <div className=\"flex items-center justify-between px-6 py-3 border-b border-border bg-card/30\">
            <div className=\"flex items-center gap-2\">
              <h2 className=\"text-sm font-medium\">Code Editor</h2>
              <Badge variant=\"secondary\" className=\"text-xs\">
                Lua
              </Badge>
            </div>
            <div className=\"flex items-center gap-2\">
              <span className=\"text-xs text-muted-foreground\">Unlimited</span>
              <Button
                variant=\"ghost\"
                size=\"sm\"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
            </div>
          </div>
          <div className=\"flex-1 overflow-hidden\">
            <CodeEditor code={code} language=\"lua\" onChange={setCode} />
          </div>
        </motion.div>

        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={springPresets.gentle}
              className=\"w-1/2 flex flex-col bg-muted/20\"
            >
              <div className=\"flex items-center justify-between px-6 py-3 border-b border-border bg-card/30\">
                <h2 className=\"text-sm font-medium\">Studio Preview</h2>
                <div className=\"flex items-center gap-2\">
                  <Button
                    variant={liveMode ? 'default' : 'outline'}
                    size=\"sm\"
                    onClick={handleToggleLive}
                    disabled={status !== ConnectionStatus.CONNECTED}
                  >
                    <Eye className=\"w-4 h-4 mr-2\" />
                    Live
                  </Button>
                  <Button
                    variant={workspaceView ? 'default' : 'outline'}
                    size=\"sm\"
                    onClick={handleRequestWorkspace}
                    disabled={status !== ConnectionStatus.CONNECTED}
                  >
                    <FolderTree className=\"w-4 h-4 mr-2\" />
                    Workspace
                  </Button>
                </div>
              </div>
              <div className=\"flex-1 p-6 overflow-auto\">
                {status !== ConnectionStatus.CONNECTED ? (
                  <div className=\"rounded-lg border border-border bg-card p-6 h-full flex items-center justify-center\">
                    <div className=\"text-center space-y-4\">
                      <AlertCircle className=\"w-16 h-16 mx-auto text-muted-foreground\" />
                      <div>
                        <h3 className=\"text-lg font-semibold mb-2\">Not Connected</h3>
                        <p className=\"text-sm text-muted-foreground max-w-md\">
                          Connect to Roblox Studio to see live preview and workspace data
                        </p>
                      </div>
                    </div>
                  </div>
                ) : workspaceView && workspaceData ? (
                  <div className=\"rounded-lg border border-border bg-card p-4 h-full overflow-auto\">
                    <h3 className=\"font-semibold mb-4\">Workspace Structure</h3>
                    <pre className=\"text-xs font-mono whitespace-pre-wrap\">
                      {JSON.stringify(workspaceData, null, 2)}
                    </pre>
                  </div>
                ) : liveMode && studioPreview ? (
                  <div className=\"rounded-lg border border-border bg-card p-2 h-full\">
                    <img
                      src={studioPreview}
                      alt=\"Studio Preview\"
                      className=\"w-full h-full object-contain\"
                    />
                  </div>
                ) : (
                  <div className=\"rounded-lg border border-border bg-card p-6 h-full flex items-center justify-center\">
                    <div className=\"text-center space-y-4\">
                      <Play className=\"w-16 h-16 mx-auto text-primary\" />
                      <div>
                        <h3 className=\"text-lg font-semibold mb-2\">Ready to Preview</h3>
                        <p className=\"text-sm text-muted-foreground max-w-md\">
                          Click \"Live\" to see real-time studio preview or \"Workspace\" to view your game structure
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className=\"border-t border-border bg-card/50 backdrop-blur-sm px-6 py-2\">
        <p className=\"text-xs text-center text-muted-foreground\">
          We do NOT own PuterJS. Please don't get that confused.
        </p>
      </footer>
    </div>
  );
}