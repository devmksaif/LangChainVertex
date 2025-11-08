import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { Sparkles, Send, ChevronDown, ChevronUp, X, Square, RefreshCw } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

import { Avatar, AvatarFallback } from './ui/avatar';

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import type { Node, Edge } from 'reactflow';
import type { NodeData } from './reactflow/utils/types';
import { Skeleton } from './ui/skeleton';
import { nodeTypesDefinition } from './reactflow/nodes/node-types';
import { useAiModelSelection } from 'hooks/use-ai-model-selection';
import { supabase } from 'integrations/supabase/client';
import { CHAT_MODELS } from 'lib/ai-models';
import { cn } from 'lib/utils';
import { useAuthStore } from 'stores/auth-store';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';

type CustomNodeType = Node<NodeData>;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatWidgetProps {
  mode: 'create' | 'edit';
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentNodes?: CustomNodeType[];
  currentEdges?: Edge[];
  onWorkflowUpdate?: (nodes: CustomNodeType[], edges: Edge[]) => void;
  workflowId?: string;
}

const baseURL = 'https://e8f716dc0045.ngrok-free.app';

export const AIChatWidget = ({ mode, isOpen, onOpenChange, currentNodes, currentEdges, onWorkflowUpdate, workflowId }: AIChatWidgetProps) => {
  const { user, profile, session } = useAuthStore();
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatHistoryLoading, setIsChatHistoryLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [model, setModel] = useAiModelSelection();
  const [availableCredentials, setAvailableCredentials] = useState<{ name: string, id: string }[]>([]);
  const [selectedCredential, setSelectedCredential] = useState('');
  const [isFetchingCreds, setIsFetchingCreds] = useState(false);
  const [credMap, setCredMap] = useState<{ [key: string]: string }>({});

  const getInitialMessage = () => {
    return mode === 'create'
      ? "Hello! I'm here to help you build workflows. Describe what you want to create, and I'll generate it for you."
      : "Hello! I see your current workflow. Tell me what changes you'd like to make.";
  };

  useEffect(() => {
    if (isOpen && user) {
      const loadOrCreateConversation = async () => {
        setIsChatHistoryLoading(true);
        setMessages([]);

        let query = supabase
            .from('ai_chat_conversations')
            .select('*')
            .eq('user_id', user.id);

        if (mode === 'edit' && workflowId) {
            query = query.eq('workflow_id', workflowId);
        } else {
            query = query.is('workflow_id', null);
        }

        const { data: conversation } = await query.order('updated_at', { ascending: false }).limit(1).single();

        if (conversation) {
            setMessages(conversation.messages);
            setConversationId(conversation.id);
        } else {
            const initialMessage = { role: 'assistant', content: getInitialMessage() };
            const { data: newConversation, error: insertError } = await supabase
                .from('ai_chat_conversations')
                .insert({
                    user_id: user.id,
                    workflow_id: mode === 'edit' ? workflowId : null,
                    messages: [initialMessage]
                })
                .select()
                .single();

            if (insertError) {
                toast.error("Could not start a new chat session.");
                onOpenChange(false);
            } else if (newConversation) {
                setMessages(newConversation.messages);
                setConversationId(newConversation.id);
            }
        }
        setIsChatHistoryLoading(false);
      };

      loadOrCreateConversation();
    }
  }, [isOpen, user, mode, workflowId]);

  useEffect(() => {
    if (isOpen && user) {
      const fetchCredentialsForService = async () => {
        setIsFetchingCreds(true);
        const service = model.startsWith('gemini') ? 'gemini' : 'openai';
        const { data, error } = await supabase
          .from('credentials')
          .select('name, id')
          .eq('user_id', user.id)
          .eq('service', service);

        if (error) {
          toast.error("Failed to fetch credentials.");
          setAvailableCredentials([]);
        } else if (data) {
          setAvailableCredentials(data);
          if (data.length > 0 && !data.some(c => c.name === selectedCredential)) {
            setSelectedCredential(data[0].name);
            data.map(cred => {
              setCredMap(prev => ({...prev, [cred.name?.toLowerCase()?.replace(" ","")]: cred.id}))
            })
          } else if (data.length === 0) {
            setSelectedCredential('');
          }
        }
        setIsFetchingCreds(false);
      };
      fetchCredentialsForService();
    }
  }, [isOpen, user, model, selectedCredential]);

  useEffect(() => {
    if (scrollAreaRef.current?.parentElement) {
      const scrollable = scrollAreaRef.current.parentElement;
      scrollable.scrollTop = scrollable.scrollHeight;
    }
  }, [messages]);

  const handleNewChat = async () => {
    if (isLoading || !user) return;
    setIsLoading(true);

    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }

    const initialMessage = { role: 'assistant', content: getInitialMessage() };
    const { data: newConversation, error: insertError } = await supabase
        .from('ai_chat_conversations')
        .insert({
            user_id: user.id,
            workflow_id: mode === 'edit' ? workflowId : null,
            messages: [initialMessage]
        })
        .select()
        .single();

    if (insertError) {
        toast.error("Could not start a new chat session.");
    } else if (newConversation) {
        setMessages(newConversation.messages);
        setConversationId(newConversation.id);
        setInputValue('');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      setIsCollapsed(false);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !selectedCredential || !conversationId) {
      if (!selectedCredential) toast.error("Please select an API Key credential to continue.");
      if (!conversationId) toast.error("Chat session not initialized.");
      return;
    }

    const newUserMessage: Message = { role: 'user', content: inputValue };
    const currentMessages = messages;

    setMessages(prev => [...prev, newUserMessage, { role: 'assistant', content: '' }]);
    setInputValue('');
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    const messagesWithUser = [...currentMessages, newUserMessage];
    const { error: saveError } = await supabase
        .from('ai_chat_conversations')
        .update({ messages: messagesWithUser })
        .eq('id', conversationId);

    if (saveError) {
        toast.error("Failed to save message. Please check your connection.");
        setMessages(currentMessages);
        setIsLoading(false);
        return;
    }

    try {
      const normalizedKey = selectedCredential.toLowerCase().replace(/\s/g, "");
      const response = await fetch(`${baseURL}/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesWithUser.map(({ role, content }) => ({ role, content })),
          model,
          credential_name: selectedCredential,
          credentialId: credMap[normalizedKey],
          mode,
          ...(mode === 'edit' && { currentNodes, currentEdges }),
          userId: user!.id,
          conversationId
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response.');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to process request.');
      }
      let fullResponse = (data.content as string) || '';

      // Check if response is a tool call, handle it
      if (fullResponse.includes('functionCall')) {
        try {
          const parsed = JSON.parse(fullResponse);
          if (Array.isArray(parsed) && parsed[0] && parsed[0].functionCall) {
            const toolCall = parsed[0].functionCall;
            if ((toolCall.name === 'build_workflow' && mode === 'create') || (toolCall.name === 'edit_workflow' && mode === 'edit')) {
              // Call the endpoint directly
              const endpoint = toolCall.name === 'build_workflow' ? '/generate-workflow' : '/edit-workflow';
              const body = toolCall.name === 'build_workflow' ? {
                message: toolCall.args.instructions,
                credential_name: selectedCredential,
                provider: model.startsWith('gemini') ? 'gemini' : 'openai',
                userId: user!.id,
                model,
                credentialId: credMap[normalizedKey]
              } : {
                workflow: { nodes: currentNodes, edges: currentEdges },
                message: toolCall.args.instructions,
                credential_name: selectedCredential,
                provider: model.startsWith('gemini') ? 'gemini' : 'openai',
                userId: user!.id,
                model,
                credentialId: credMap[normalizedKey]
              };
              const toolResponse = await fetch(`${baseURL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              });
              const toolData = await toolResponse.json();
              if (toolData.success && toolData.workflow) {
                fullResponse = JSON.stringify(toolData.workflow);
              } else {
                throw new Error(toolData.message || 'Failed to generate workflow');
              }
            }
          }
        } catch (e) {
          fullResponse = 'Failed to process tool call';
        }
      }

      // Try to parse as JSON workflow
      try {
        const workflowData = JSON.parse(fullResponse);
        if (workflowData.nodes && workflowData.edges) {
          // It's a workflow, apply it
          const confirmationMessage = mode === 'create'
            ? "Great! I have built the workflow for you."
            : "Great! I have applied the changes.";
          const finalMessages: Message[] = [...messagesWithUser, { role: 'assistant', content: confirmationMessage }];
          await supabase.from('ai_chat_conversations').update({ messages: finalMessages }).eq('id', conversationId);
          setMessages(finalMessages);
          await applyWorkflow(workflowData);
          return;
        }
      } catch (e) {
        // Not JSON, treat as message
      }

      const finalMessages: Message[] = [...messagesWithUser, { role: 'assistant', content: fullResponse }];
      await supabase.from('ai_chat_conversations').update({ messages: finalMessages }).eq('id', conversationId);
      setMessages(finalMessages);

    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        toast.error(errorMessage);
        setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = `Sorry, I ran into an error: ${errorMessage}`;
            return newMessages;
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const applyWorkflow = async (workflowData: { nodes: CustomNodeType[], edges: Edge[] }) => {
    const toastId = toast.loading(mode === 'create' ? "Applying workflow..." : "Updating workflow...");
    try {
      if (mode === 'create') {
        const newWorkflowName = `AI - ${inputValue.substring(0, 20)}${inputValue.length > 20 ? '...' : ''}`;
        const { data: newWorkflow, error: createError } = await supabase
          .from('workflows')
          .insert({ user_id: user!.id, name: newWorkflowName, nodes: workflowData.nodes, edges: workflowData.edges })
          .select('id')
          .single();
        if (createError) throw new Error(createError.message);

        // Link the conversation to the new workflow
        if (conversationId) {
            await supabase.from('ai_chat_conversations').update({ workflow_id: newWorkflow.id }).eq('id', conversationId);
        }

        toast.success("Workflow created successfully!", { id: toastId });
        navigate(`/flow/${newWorkflow.id}`);
      } else {
        onWorkflowUpdate?.(workflowData.nodes, workflowData.edges);
        toast.success("Workflow updated successfully!", { id: toastId });
      }

      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast.error(errorMessage, { id: toastId });
    }
  };

  const handleStopGenerating = () => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-full max-w-lg z-50 shadow-2xl animate-slide-up border-border/50 bg-background/95 backdrop-blur-lg">
      <CardHeader className="flex flex-row items-center justify-between p-4 cursor-pointer border-b border-border/50" onClick={() => setIsCollapsed(!isCollapsed)}>
        <CardTitle className="flex items-center gap-3 text-base">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Sparkles className="text-white h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">{mode === 'create' ? 'Create with AI' : 'Edit with AI'}</span>
            <span className="text-xs text-muted-foreground">Powered by {model}</span>
          </div>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent/50" onClick={(e) => { e.stopPropagation(); handleNewChat(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent/50">
            {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); onOpenChange(false); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <>
          <CardContent className="p-0 bg-gradient-to-b from-background to-muted/20">
            <ScrollArea className="h-96 px-4" ref={scrollAreaRef}>
              <div className="space-y-6 py-4">
                {isChatHistoryLoading ? (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-16 w-3/4 rounded-xl" />
                        </div>
                        <div className="flex items-start gap-3 justify-end">
                          <Skeleton className="h-12 w-1/2 rounded-xl" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                    </div>
                ) : (
                    messages.map((message, index) => (
                    <div key={index} className={cn("flex items-start gap-3 group", message.role === 'user' ? 'justify-end' : '')}>
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-sm">
                            <Sparkles className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <div className={cn(
                          "relative p-4 max-w-sm rounded-2xl shadow-sm border transition-all group-hover:shadow-md",
                          message.role === 'assistant'
                            ? 'bg-background border-border rounded-tl-sm'
                            : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-transparent rounded-tr-sm'
                        )}>
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">
                            {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                          </div>
                          {message.role === 'assistant' && isLoading && index === messages.length - 1 && (
                            <div className="flex items-center gap-1 mt-2 text-muted-foreground">
                              <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
                              <div className="w-1 h-1 bg-current rounded-full animate-pulse animation-delay-200" />
                              <div className="w-1 h-1 bg-current rounded-full animate-pulse animation-delay-400" />
                            </div>
                          )}
                        </div>
                        {message.role === 'user' && (
                          <Avatar className="w-8 h-8 ring-2 ring-border shadow-sm">
                            <AvatarFallback className="bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold">
                              {user?.email?.[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                    </div>
                    ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-4 p-4 border-t border-border/50 bg-background/50">
            {isLoading && (
              <Button onClick={handleStopGenerating} variant="outline" className="w-full hover:bg-destructive/10 hover:text-destructive hover:border-destructive">
                <Square className="mr-2 h-4 w-4" /> Stop Generating
              </Button>
            )}
            {!isLoading && (
              <div className="w-full flex items-end gap-3">
                <div className="flex-1">
                  <Textarea
                    placeholder="Describe what you want to create or modify..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isLoading || isChatHistoryLoading}
                    rows={2}
                    className="resize-none min-h-[60px]"
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || isChatHistoryLoading || !inputValue.trim()}
                  className="h-[60px] px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="ai-model-select" className="text-xs font-medium text-muted-foreground">AI Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="ai-model-select" className="h-9">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHAT_MODELS).map(([group, models]) => (
                      <SelectGroup key={group}>
                        <SelectLabel>{group}</SelectLabel>
                        {models.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="ai-credential-select" className="text-xs font-medium text-muted-foreground">API Key</Label>
                <Select value={selectedCredential} onValueChange={(e) =>{ setSelectedCredential(e); }} disabled={isFetchingCreds || availableCredentials.length === 0}>
                  <SelectTrigger id="ai-credential-select" className="h-9">
                    <SelectValue placeholder={isFetchingCreds ? "Loading..." : "Select a key"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCredentials.map(cred => (<SelectItem key={cred.id} value={cred.name}>{cred.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                {!isFetchingCreds && availableCredentials.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No key for this model. Add one in Credentials.</p>
                )}
              </div>
            </div>
          </CardFooter>
        </>
      )}
    </Card>
  );
};
