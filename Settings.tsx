import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, Wifi, WifiOff, Key, Zap, Code, Save, TestTube, AlertCircle, CheckCircle2, Settings as SettingsIcon, LogIn, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ConnectionStatus, WS_SERVER_URL } from '@/lib/index';
import { fadeInUp, staggerContainer, staggerItem, springPresets } from '@/lib/motion';
import { puterService, PuterUser } from '@/lib/puter';
import { toast } from 'sonner';

interface SettingsConfig {
  serverUrl: string;
  autoReconnect: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  enableNotifications: boolean;
  darkMode: boolean;
  codeTheme: string;
  autoSave: boolean;
  autoSaveInterval: number;
}

const DEFAULT_SETTINGS: SettingsConfig = {
  serverUrl: WS_SERVER_URL,
  autoReconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 5,
  enableNotifications: true,
  darkMode: true,
  codeTheme: 'monokai',
  autoSave: true,
  autoSaveInterval: 30000,
};

export default function Settings() {
  const [settings, setSettings] = useState<SettingsConfig>(() => {
    const saved = localStorage.getItem('roblox-ai-settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });
  const [testUrl, setTestUrl] = useState(settings.serverUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [puterUser, setPuterUser] = useState<PuterUser | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const { status, connect, disconnect } = useWebSocket(settings.serverUrl);

  useEffect(() => {
    localStorage.setItem('roblox-ai-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    puterService.getUser().then(setPuterUser);
  }, []);

  const updateSetting = <K extends keyof SettingsConfig>(key: K, value: SettingsConfig[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem('roblox-ai-settings', JSON.stringify(settings));
    setHasChanges(false);
    if (settings.serverUrl !== testUrl) {
      disconnect();
      setTimeout(() => connect(), 100);
    }
    toast.success('Settings saved');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const testWs = new WebSocket(testUrl);
      
      const timeout = setTimeout(() => {
        testWs.close();
        setTestResult({ success: false, message: 'Connection timeout' });
        setIsTesting(false);
      }, 5000);

      testWs.onopen = () => {
        clearTimeout(timeout);
        setTestResult({ success: true, message: 'Connection successful' });
        testWs.close();
        setIsTesting(false);
      };

      testWs.onerror = () => {
        clearTimeout(timeout);
        setTestResult({ success: false, message: 'Connection failed' });
        setIsTesting(false);
      };
    } catch (error) {
      setTestResult({ success: false, message: 'Invalid URL or connection error' });
      setIsTesting(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setTestUrl(DEFAULT_SETTINGS.serverUrl);
    setHasChanges(true);
    toast.info('Settings reset to defaults');
  };

  const handlePuterLogin = async () => {
    setIsLoggingIn(true);
    try {
      const user = await puterService.login();
      setPuterUser(user);
      toast.success(`Logged in as ${user.username}`);
    } catch (error) {
      toast.error('Failed to login to PuterJS');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePuterLogout = async () => {
    try {
      await puterService.logout();
      setPuterUser(null);
      toast.success('Logged out from PuterJS');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return 'text-green-500';
      case ConnectionStatus.CONNECTING:
        return 'text-yellow-500';
      case ConnectionStatus.ERROR:
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return <Wifi className=\"w-4 h-4\" />;
      case ConnectionStatus.CONNECTING:
        return <Zap className=\"w-4 h-4 animate-pulse\" />;
      default:
        return <WifiOff className=\"w-4 h-4\" />;
    }
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial=\"hidden\"
      animate=\"visible\"
      className=\"min-h-screen bg-background p-6\"
    >
      <div className=\"max-w-5xl mx-auto space-y-6\">
        <motion.div variants={fadeInUp} className=\"flex items-center justify-between\">
          <div>
            <h1 className=\"text-4xl font-bold tracking-tight flex items-center gap-3\">
              <SettingsIcon className=\"w-10 h-10 text-primary\" />
              Settings
            </h1>
            <p className=\"text-muted-foreground mt-2\">
              Configure your Roblox AI Game Builder connection and preferences
            </p>
          </div>
          <div className=\"flex items-center gap-3\">
            <Badge variant=\"outline\" className={`${getStatusColor()} border-current`}>
              <span className=\"flex items-center gap-2\">
                {getStatusIcon()}
                {status}
              </span>
            </Badge>
            {hasChanges && (
              <Button onClick={handleSave} size=\"lg\" className=\"gap-2\">
                <Save className=\"w-4 h-4\" />
                Save Changes
              </Button>
            )}
          </div>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Tabs defaultValue=\"puter\" className=\"w-full\">
            <TabsList className=\"grid w-full grid-cols-3\">
              <TabsTrigger value=\"puter\">PuterJS Login</TabsTrigger>
              <TabsTrigger value=\"connection\">Connection</TabsTrigger>
              <TabsTrigger value=\"preferences\">Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value=\"puter\" className=\"space-y-6 mt-6\">
              <motion.div variants={staggerItem}>
                <Card>
                  <CardHeader>
                    <CardTitle className=\"flex items-center gap-2\">
                      <User className=\"w-5 h-5 text-primary\" />
                      Login to PuterJS
                    </CardTitle>
                    <CardDescription>
                      Create an account on PuterJS if you haven't have a PuterJS account yet.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className=\"space-y-4\">
                    {puterUser ? (
                      <div className=\"space-y-4\">
                        <div className=\"p-4 bg-green-500/10 border border-green-500/20 rounded-lg\">
                          <div className=\"flex items-center justify-between\">
                            <div>
                              <p className=\"font-semibold text-green-500\">Logged in as</p>
                              <p className=\"text-lg font-bold\">{puterUser.username}</p>
                              {puterUser.email && (
                                <p className=\"text-sm text-muted-foreground\">{puterUser.email}</p>
                              )}
                            </div>
                            <CheckCircle2 className=\"w-8 h-8 text-green-500\" />
                          </div>
                        </div>
                        <Button
                          onClick={handlePuterLogout}
                          variant=\"outline\"
                          className=\"w-full gap-2\"
                        >
                          <LogOut className=\"w-4 h-4\" />
                          Logout from PuterJS
                        </Button>
                      </div>
                    ) : (
                      <div className=\"space-y-4\">
                        <div className=\"p-4 bg-muted/50 rounded-lg space-y-2\">
                          <h4 className=\"font-semibold text-sm\">Why login to PuterJS?</h4>
                          <ul className=\"text-sm text-muted-foreground space-y-1\">
                            <li>• Access to advanced AI models (Gemini 3.1, Claude Opus 4.6, ChatGPT 5.3)</li>
                            <li>• Generate code with natural language prompts</li>
                            <li>• Analyze and improve your Roblox workspace</li>
                            <li>• Free to use with no credit card required</li>
                          </ul>
                        </div>
                        <Button
                          onClick={handlePuterLogin}
                          disabled={isLoggingIn}
                          className=\"w-full gap-2\"
                          size=\"lg\"
                        >
                          <LogIn className=\"w-4 h-4\" />
                          {isLoggingIn ? 'Logging in...' : 'Login using PuterJS'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card className=\"border-blue-500/20 bg-blue-500/5\">
                  <CardHeader>
                    <CardTitle className=\"text-blue-500 flex items-center gap-2\">
                      <AlertCircle className=\"w-5 h-5\" />
                      About PuterJS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className=\"space-y-2 text-sm text-muted-foreground\">
                    <p>PuterJS is a third-party service that provides AI capabilities for this application.</p>
                    <p>• We do NOT own PuterJS</p>
                    <p>• Your PuterJS credentials are managed by PuterJS, not by us</p>
                    <p>• Visit <a href=\"https://puter.com\" target=\"_blank\" rel=\"noopener noreferrer\" className=\"text-primary underline\">puter.com</a> to learn more</p>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value=\"connection\" className=\"space-y-6 mt-6\">
              <motion.div variants={staggerItem}>
                <Card>
                  <CardHeader>
                    <CardTitle className=\"flex items-center gap-2\">
                      <Server className=\"w-5 h-5 text-primary\" />
                      WebSocket Server
                    </CardTitle>
                    <CardDescription>
                      Configure the WebSocket server URL for plugin communication
                    </CardDescription>
                  </CardHeader>
                  <CardContent className=\"space-y-4\">
                    <div className=\"space-y-2\">
                      <Label htmlFor=\"serverUrl\">Server URL</Label>
                      <div className=\"flex gap-2\">
                        <Input
                          id=\"serverUrl\"
                          value={testUrl}
                          onChange={(e) => {
                            setTestUrl(e.target.value);
                            updateSetting('serverUrl', e.target.value);
                          }}
                          placeholder=\"wss://codeit.rest\"
                          className=\"font-mono\"
                        />
                        <Button
                          onClick={handleTestConnection}
                          disabled={isTesting}
                          variant=\"outline\"
                          className=\"gap-2 min-w-[120px]\"
                        >
                          <TestTube className=\"w-4 h-4\" />
                          {isTesting ? 'Testing...' : 'Test'}
                        </Button>
                      </div>
                      {testResult && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={springPresets.snappy}
                          className={`flex items-center gap-2 text-sm ${
                            testResult.success ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {testResult.success ? (
                            <CheckCircle2 className=\"w-4 h-4\" />
                          ) : (
                            <AlertCircle className=\"w-4 h-4\" />
                          )}
                          {testResult.message}
                        </motion.div>
                      )}
                    </div>

                    <Separator />

                    <div className=\"space-y-4\">
                      <div className=\"flex items-center justify-between\">
                        <div className=\"space-y-0.5\">
                          <Label>Auto Reconnect</Label>
                          <p className=\"text-sm text-muted-foreground\">
                            Automatically reconnect on connection loss
                          </p>
                        </div>
                        <Switch
                          checked={settings.autoReconnect}
                          onCheckedChange={(checked) => updateSetting('autoReconnect', checked)}
                        />
                      </div>

                      {settings.autoReconnect && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={springPresets.gentle}
                          className=\"space-y-4 pl-4 border-l-2 border-primary/20\"
                        >
                          <div className=\"space-y-2\">
                            <Label htmlFor=\"reconnectDelay\">Reconnect Delay (ms)</Label>
                            <Input
                              id=\"reconnectDelay\"
                              type=\"number\"
                              value={settings.reconnectDelay}
                              onChange={(e) => updateSetting('reconnectDelay', parseInt(e.target.value))}
                              min={100}
                              max={10000}
                              step={100}
                            />
                          </div>
                          <div className=\"space-y-2\">
                            <Label htmlFor=\"maxAttempts\">Max Reconnect Attempts</Label>
                            <Input
                              id=\"maxAttempts\"
                              type=\"number\"
                              value={settings.maxReconnectAttempts}
                              onChange={(e) => updateSetting('maxReconnectAttempts', parseInt(e.target.value))}
                              min={1}
                              max={20}
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card className=\"border-yellow-500/20 bg-yellow-500/5\">
                  <CardHeader>
                    <CardTitle className=\"text-yellow-500 flex items-center gap-2\">
                      <AlertCircle className=\"w-5 h-5\" />
                      Getting Started
                    </CardTitle>
                  </CardHeader>
                  <CardContent className=\"space-y-3 text-sm text-muted-foreground\">
                    <div className=\"flex items-start gap-3\">
                      <div className=\"flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold\">
                        1
                      </div>
                      <div>
                        <p className=\"font-medium text-foreground\">Install Roblox Plugin</p>
                        <p>Download and install the companion plugin in Roblox Studio</p>
                      </div>
                    </div>
                    <div className=\"flex items-start gap-3\">
                      <div className=\"flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold\">
                        2
                      </div>
                      <div>
                        <p className=\"font-medium text-foreground\">Connect to Server</p>
                        <p>Make sure HTTP requests are enabled in Studio settings</p>
                      </div>
                    </div>
                    <div className=\"flex items-start gap-3\">
                      <div className=\"flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold\">
                        3
                      </div>
                      <div>
                        <p className=\"font-medium text-foreground\">Start Building</p>
                        <p>Use AI prompts to generate game code instantly</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value=\"preferences\" className=\"space-y-6 mt-6\">
              <motion.div variants={staggerItem}>
                <Card>
                  <CardHeader>
                    <CardTitle>Editor Preferences</CardTitle>
                    <CardDescription>
                      Customize your code editor experience
                    </CardDescription>
                  </CardHeader>
                  <CardContent className=\"space-y-4\">
                    <div className=\"flex items-center justify-between\">
                      <div className=\"space-y-0.5\">
                        <Label>Auto Save</Label>
                        <p className=\"text-sm text-muted-foreground\">
                          Automatically save changes while editing
                        </p>
                      </div>
                      <Switch
                        checked={settings.autoSave}
                        onCheckedChange={(checked) => updateSetting('autoSave', checked)}
                      />
                    </div>

                    {settings.autoSave && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={springPresets.gentle}
                        className=\"space-y-2 pl-4 border-l-2 border-primary/20\"
                      >
                        <Label htmlFor=\"autoSaveInterval\">Auto Save Interval (seconds)</Label>
                        <Input
                          id=\"autoSaveInterval\"
                          type=\"number\"
                          value={settings.autoSaveInterval / 1000}
                          onChange={(e) => updateSetting('autoSaveInterval', parseInt(e.target.value) * 1000)}
                          min={5}
                          max={300}
                          step={5}
                        />
                      </motion.div>
                    )}

                    <Separator />

                    <div className=\"space-y-2\">
                      <Label htmlFor=\"codeTheme\">Code Theme</Label>
                      <select
                        id=\"codeTheme\"
                        value={settings.codeTheme}
                        onChange={(e) => updateSetting('codeTheme', e.target.value)}
                        className=\"w-full px-3 py-2 bg-background border border-input rounded-md\"
                      >
                        <option value=\"monokai\">Monokai</option>
                        <option value=\"github-dark\">GitHub Dark</option>
                        <option value=\"dracula\">Dracula</option>
                        <option value=\"nord\">Nord</option>
                        <option value=\"one-dark\">One Dark</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card>
                  <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>
                      Control notification preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className=\"space-y-4\">
                    <div className=\"flex items-center justify-between\">
                      <div className=\"space-y-0.5\">
                        <Label>Enable Notifications</Label>
                        <p className=\"text-sm text-muted-foreground\">
                          Receive notifications for important events
                        </p>
                      </div>
                      <Switch
                        checked={settings.enableNotifications}
                        onCheckedChange={(checked) => updateSetting('enableNotifications', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card>
                  <CardHeader>
                    <CardTitle className=\"flex items-center gap-2\">
                      <Code className=\"w-5 h-5 text-primary\" />
                      Developer Options
                    </CardTitle>
                    <CardDescription>
                      Advanced settings for developers
                    </CardDescription>
                  </CardHeader>
                  <CardContent className=\"space-y-4\">
                    <div className=\"p-4 bg-muted/50 rounded-lg space-y-2\">
                      <h4 className=\"font-semibold text-sm\">Current Configuration</h4>
                      <pre className=\"text-xs font-mono overflow-x-auto\">
                        {JSON.stringify(settings, null, 2)}
                      </pre>
                    </div>

                    <Separator />

                    <div className=\"flex gap-2\">
                      <Button onClick={handleReset} variant=\"outline\" className=\"gap-2\">
                        <AlertCircle className=\"w-4 h-4\" />
                        Reset to Defaults
                      </Button>
                      <Button
                        onClick={() => {
                          const dataStr = JSON.stringify(settings, null, 2);
                          const dataBlob = new Blob([dataStr], { type: 'application/json' });
                          const url = URL.createObjectURL(dataBlob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = 'roblox-ai-settings.json';
                          link.click();
                          URL.revokeObjectURL(url);
                        }}
                        variant=\"outline\"
                        className=\"gap-2\"
                      >
                        <Save className=\"w-4 h-4\" />
                        Export Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <footer className=\"mt-12 border-t border-border pt-6\">
        <p className=\"text-xs text-center text-muted-foreground\">
          We do NOT own PuterJS. Please don't get that confused.
        </p>
      </footer>
    </motion.div>
  );
}